import { Op } from "sequelize";
import {
  Build,
  Collection,
  Tag,
  User,
  Category,
  Image,
  BuildFile,
} from "../models";
import {
  searchQueryBuilder,
  parseSimplifiedLitematic,
  parseLitematic,
  writeLitematic,
} from "../utils";
import { errors } from "../client-error";
import fs from "fs";
import { validate as validateJSON } from "jsonschema";
import crypto from "crypto";
import { Express } from "express";
import { AuthReq, BuildReq, OptionalAuthReq, Res } from "../../types";

const canView = (res, build, user, message = "Build not found.") => {
  if (!build || !build.canView(user)) {
    errors.NOT_FOUND.send(res, message);
    return false;
  }

  return true;
};

const canEdit = (res, build, user, message = "Unauthorized.") => {
  if (!canView(res, build, user)) {
    return false;
  }

  if (!build || !build.canEdit(user)) {
    errors.UNAUTHORIZED.send(res, message);
    return false;
  }

  return true;
};

const litematicSchema = {
  type: "object",
  properties: {
    MinecraftDataVersion: { type: "number" },
    Version: { type: "number" },
    Metadata: {
      type: "object",
      properties: {
        EnclosingSize: {
          type: "object",
          properties: {
            x: {
              type: "number",
              minimum: 1,
            },
            y: {
              type: "number",
              minimum: 1,
            },
            z: {
              type: "number",
              minimum: 1,
            },
          },
          required: ["x", "y", "z"],
        },
      },
      required: ["EnclosingSize"],
    },
  },
  required: ["Metadata", "Version", "MinecraftDataVersion"],
};

const create = async function (req: AuthReq, res: Res) {
  const {
    description,
    title,
    categoryName,
    imageIds,
  }: {
    description?: string;
    title?: string;
    categoryName?: string;
    collectionId?: number;
    imageIds?: string[];
  } = req.body;
  const file = req.file;

  if (file === undefined) {
    errors.BAD_REQUEST.send(res);
    return;
  }

  // Validate litematic file
  const simpleLitematic = await parseSimplifiedLitematic(file?.path);

  if (!validateJSON(simpleLitematic, litematicSchema).valid) {
    errors.BAD_REQUEST.send(res, "Error parsing litematic file.");
    return;
  }

  const tags =
    req.body.tags?.map((i) => i.toLowerCase().substring(0, 255)) || [];

  if (categoryName) {
    if (!(await Category.findByPk(categoryName))) {
      errors.NOT_FOUND.send(res, "Category not found.");
      return;
    }
  }

  let collectionId;

  if (req.body?.collectionId) {
    if (
      !(await Collection.findOne({
        where: { id: req.body?.collectionId, creatorUuid: req.user.uuid },
      }))
    ) {
      errors.NOT_FOUND.send(res, "Collection not found.");
      return;
    } else {
      collectionId = req.body?.collectionId;
    }
  } else if (req.body?.collectionName && req.body?.collectionDescription) {
    collectionId = await Collection.create({
      name: req.body?.collectionName,
      description: req.body?.collectionDescription,
      creatorUuid: req.user.uuid,
    }).then((model) => model.id);
  }

  const buildFile = await BuildFile.create({
    filename: file.filename,
    version: simpleLitematic.Version,
    minecraftDataVersion: simpleLitematic.MinecraftDataVersion,
    x: simpleLitematic.Metadata?.EnclosingSize?.x,
    y: simpleLitematic.Metadata?.EnclosingSize?.y,
    z: simpleLitematic.Metadata?.EnclosingSize?.z,
    blockCount: simpleLitematic.Metadata?.TotalBlocks,
    md5: "",
  });

  const build = await Build.create({
    title,
    description,
    creatorUuid: req.user.uuid,
    collectionId,
    categoryName,
    buildFileId: buildFile.id,
  });

  if (imageIds) {
    await build.setImagesById(imageIds);
  }

  // Add file id to the build file
  const { parsed: litematicWithId } = await parseLitematic(
    "uploads/" + buildFile.filename
  );

  if (litematicWithId?.value?.Metadata?.value) {
    litematicWithId.value.Metadata.value.Id = {
      type: "int",
      value: build.id,
    };
  }

  await writeLitematic("uploads/" + buildFile.filename, litematicWithId).then(
    async () => {
      // Calculate build file hash
      const hashSum = crypto.createHash("md5");
      hashSum.update(fs.readFileSync("uploads/" + buildFile.filename));

      // Update md5 hash
      await buildFile.update({
        md5: hashSum.digest("hex"),
      });
    }
  );

  // Add tags
  for (const name of tags) {
    const [instance] = await Tag.findOrCreate({
      where: { name },
      defaults: {
        name,
      },
    });
    await build.addTag(instance);
  }

  res.send(await build.toJSON(req.user));

  try {
    await req.user.purgeImages();
  } catch (ignored) {
    console.log(ignored);
  }
};

// FIXME clean this
const search = async function (req: OptionalAuthReq, res: Res) {
  const {
    tags,
    collection,
    category,
    title,
    sort,
    uuid,
    approved,
    includePrivate,
  } = req.query;
  const searchQuery = searchQueryBuilder(req.query);

  // Sorting order
  const where = {
    collectionId: parseInt(collection) || undefined,
    categoryName: category ? { [Op.startsWith]: category } : undefined,
    title: title
      ? {
          [Op.iLike]: "%" + title + "%",
        }
      : undefined,
    creatorUuid: uuid,
    approved,
    ...(!(req.user?.moderator && includePrivate) && { private: false }),
  };

  Build.findAll({
    ...searchQuery,
    where: Object.fromEntries(
      Object.entries(where).filter(([k, v]) => v !== undefined)
    ),
    ...(sort === "new" && { order: [["createdAt", "DESC"]] }),
    ...(sort === "top" && { order: [["totalSaves", "DESC"]] }),
    ...(sort === "popular" && { order: [["score", "DESC"]] }),
    include: [
      {
        model: Tag,
        ...(tags && {
          where: {
            name: {
              [Op.in]: tags.split(",").map((i) => i.toLowerCase()),
            },
          },
        }),
      },
      {
        model: User,
        as: "creator",
      },
      { model: Image, as: "images" },
    ],
  })
    .then(async (builds) => {
      res.send(await Build.toJSONArray(builds, req.user));
    })
    .catch((err) => errors.SERVER_ERROR.send(res, err));
};

const getFeed = async function (req: AuthReq, res: Res) {
  const user = req.user;
  const follows = (await user.getFollows()).map((u) => u.uuid);

  const builds = await Build.findAll({
    order: [["createdAt", "DESC"]],
    include: {
      model: User,
      as: "creator",
      where: {
        uuid: { [Op.in]: follows },
      },
    },
  });

  res.send(await Build.toJSONArray(builds, user));
};

const downloadBuild = async function (req: OptionalAuthReq, res: Res) {
  const { buildId } = req.params;
  const build = await Build.findByPk(parseInt(buildId)).catch(() => undefined);

  if (!build) {
    errors.NOT_FOUND.send(res, "Build not found.");
    return;
  }

  if (!build.approved) {
    errors.NOT_FOUND.send(res, "Build not found.");
    return;
  }

  if (build.private && (await build.getCreator()).uuid !== req.user?.uuid) {
    errors.NOT_FOUND.send(res, "Build not found.");
    return;
  }

  res.download(
    "./uploads/" + build.buildFile.filename,
    build.buildFile.filename
  );
};

const get = async function (req: BuildReq, res: Res) {
  res.send(await req.build.toJSON(req.user));
  req.build.addView();
};

const save = async function (req: BuildReq & AuthReq, res: Res) {
  const { user, build } = req;
  const shouldSave = req.body.save;

  const isSaved = await user.hasSavedBuild(build);

  if (shouldSave && !isSaved) {
    await user.addSavedBuild(build);
  } else if (!shouldSave && isSaved) {
    await user.removeSavedBuild(build);
  }

  await build.updateTotals();

  res.send(shouldSave ? "Build saved" : "Build unsaved");
};

const bookmark = async function (req: BuildReq & AuthReq, res: Res) {
  const { user, build } = req;
  const addBookmark = req.body.bookmark;

  const isSaved = await user.hasBookmark(build);

  if (addBookmark && !isSaved) {
    await user.addBookmark(build);
  } else if (!addBookmark && isSaved) {
    await user.removeBookmark(build);
  }

  res.send(addBookmark ? "Build bookmarked" : "Bookmark removed");
};

const update = async function (req: BuildReq & AuthReq, res: Res) {
  const { user, build } = req;
  const {
    description,
    title,
    collectionId,
    imageIds,
    private: isPrivate,
  }: {
    description?: string;
    title?: string;
    collectionId?: number;
    imageIds?: string[];
    private?: boolean;
  } = req.body;

  await build
    .update({
      description: description || build.description,
      title: title || build.title,
      collectionId: collectionId || build.collectionId,
      private: isPrivate !== undefined ? isPrivate : build.private,
    })
    .then(async () => {
      if (imageIds) {
        await build.setImagesById(imageIds);
      }
    })
    .then(() => res.send("OK"));
};

const deleteBuild = async function (req: BuildReq & AuthReq, res: Res) {
  req.build
    .destroy()
    .then(() => res.send("OK"))
    .catch((err) => errors.SERVER_ERROR.send(res));
};

const approve = async function (req: BuildReq, res: Res) {
  const approve = req.body.approve;

  req.build.update({ approved: approve }).then(() => res.send("OK"));
};

const uploadImages = async function (req: AuthReq, res: Res) {
  const images = req.files;

  if (!images || !images.length) {
    errors.BAD_REQUEST.send(res);
    return;
  }

  await Image.bulkCreate(
    images.map((i) => ({
      filename: i.filename,
      creatorUuid: req.user?.uuid,
    }))
  ).then(async (images) =>
    res.send(await Promise.all(images.map((i) => i.toJSON())))
  );
};
export {
  create,
  search,
  getFeed,
  downloadBuild,
  get,
  save,
  bookmark,
  update,
  deleteBuild,
  approve,
  uploadImages,
};
