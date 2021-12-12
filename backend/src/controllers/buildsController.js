const { Category, User } = require("../models");
const { Op } = require("sequelize");
const { Build, Collection, Tag } = require("../models/index");

exports.create = async function (req, res) {
    if (req.files?.buildFile === undefined) {
        res.status(400).send('No build file attached.')
        return;
    }

    const buildFile = req.files?.buildFile[0];
    const { description, title, category: categoryString, collectionId } = req.body;
    const tags = req.body.tags?.split(",").slice(0,3).map(i => i.toLowerCase()) || [];

    if (!buildFile || !title) {
        res.status(400).send("Bad request");
        return;
    }

    const images = [];

    for (const image of (req.files?.images || [])) {
        images.push(image.filename);
    }

    const collection = collectionId ? await Collection.findOne({
        where: {
            id: collectionId,
            ownerId: req.user.uuid,
        }
    }) : null;

    // const [collection] = collectionName ?
    //     await Collection.getOrCreateCollection(collectionName, collectionDescription, req.user.id) :
    //     [null];

    const [category] = categoryString ?
        await Category.getOrCreateCategory(categoryString) :
        [null];

    const values = {
        title,
        description,
        buildFile: buildFile.filename,
        images,
        creatorId: req.user.uuid,
        tags,
        collectionId: collection?.id,
        categoryName: category?.name,
    }

    const build = await Build.create(values);

    for (const tagName of tags) {
        const [tag] = await Tag.findOrCreate({
            where: {
                name: tagName,
            },
            defaults: {
                name: tagName,
            }
        });

        build.addTag(tag);
    }

    res.send(`${build.id}`);
}

exports.getBuilds = async function (req, res) {
    const { timespan, tags, collection, category, title, sort, uuid } = req.query;

    const where = {};
    let tagsWhere = undefined;
    let order = undefined;

    // Tags
    if (tags && tags.length !== 0) {
        tagsWhere = {
            name: {
                [Op.in]: tags.split(",").map(i => i.toLowerCase()),
            }
        }
    }

    // Date
    if (!isNaN(parseFloat(timespan))) {
        where.createdAt = {
            [Op.gte]: new Date(new Date().getTime() - timespan),
        };
    }

    // Collection
    if (!isNaN(parseInt(collection))) {
        where.collectionId = parseInt(collection);
    }

    // Category
    if (category) {
        where.categoryName = {
            [Op.startsWith]: category,
        }
    }

    // Title
    if (title) {
        where.title = {
            [Op.iLike]: "%" + title + "%",
        }
    }

    if (uuid) {
        where.creatorId = uuid;
    }

    // Sorting order
    if (sort === "new") {
        order = [[ 'createdAt', 'DESC' ]]
    } else if (sort === "top") {
        order = [[ 'totalFavorites', 'DESC' ]];
    }

    const builds = await Build.findAll({
        where,
        include: [{
            model: Tag,
            where: tagsWhere,
        }],
        order,
        offset: isNaN(parseInt(req.query.offset)) ? 0 : Math.max(0, parseInt(req.query.offset)),
        limit: isNaN(parseInt(req.query.amount)) ? 20 : Math.max(1, Math.min(parseInt(req.query.amount), 50)),
    });

    res.send(await Promise.all(builds.map(build => build.toJSON())));
}

exports.getBuild = async function (req, res) {
    const { buildId } = req.params;

    if (isNaN(parseFloat(buildId))) {
        res.status(400).send('Bad request');
        return;
    }

    const build = await Build.findOne({
        where: {
            id: buildId,
        },
    });

    if (!build) {
        res.status(404).send('Build not found')
        return;
    }
    res.send(await build.toJSON());
}

exports.favorite = async function (req, res) {
    const user = req.user;
    const { buildId } = req.params;
    const addFavorite = req.query.favorite === 'true';

    if (buildId === null || isNaN(parseInt(buildId))) {
        res.status(400).send('Bad request');
        return;
    }

    const build = await Build.findOne({
        where: {
            id: buildId,
        }
    });

    if (!build) {
        res.status(404).send('Build not found');
        return;
    }

    const inFavorites = await user.hasFavorite(build);

    if (addFavorite && !inFavorites) {
        await user.addFavorite(build);
        build.totalFavorites += 1;
    } else if (!addFavorite && inFavorites) {
        await user.removeFavorite(build);
        build.totalFavorites -= 1;
    }

    await build.save();

    res.status(200).send(addFavorite ?
        'Build added to favorites' :
        'Build removed from favorites');
}

exports.download = function (req, res) {

}

exports.search = function (req, res) {

}

exports.save = async function (req, res) {
    const user = req.user;
    const { buildId } = req.params;
    const addSave = req.query.save === 'true';

    if (buildId === null || isNaN(parseInt(buildId))) {
        res.status(400).send('Bad request');
        return;
    }

    const build = await Build.findOne({
        where: {
            id: buildId,
        }
    });

    const isSaved = await user.hasSave(build);

    if (addSave && !isSaved) {
        await user.addSave(build);
    } else if (!addSave && isSaved) {
        await user.removeSave(build);
    }

    res.send(addSave ?
        'Build saved' :
        'Build unsaved');
}
