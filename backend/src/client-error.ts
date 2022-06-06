import { Response } from "express";

const ClientError = function (
  code = "INTERNAL_ERROR",
  status = 500,
  info = ""
) {
  this.code = code;
  this.status = status;
  this.info = info;
};

ClientError.prototype.send = function (res: Response, message = "") {
  this.info = this.info || message;
  res.status(this.status).send(this.toString());
};

ClientError.prototype.toString = function () {
  const obj = Object(this);
  if (obj !== this) {
    throw new TypeError();
  }

  return `Error ${this.code}: ${this.status} ${this.info}`;
};

const middleware = (req, res, next) => {
  res.sendError = (code, status, info) => {
    new ClientError(code, status, info).send(res);
  };

  next();
};

const errors = {
  SERVER_ERROR: new ClientError("INTERNAL_ERROR", 500),
  ROUTE_NOT_FOUND: new ClientError(
    "ROUTE_NOT_FOUND",
    404,
    "This route does not exist."
  ),
  USER_NOT_FOUND: new ClientError("USER_NOT_FOUND", 404),
  NOT_FOUND: new ClientError("NOT_FOUND", 404),
  BAD_REQUEST: new ClientError("BAD_REQUEST", 400),
  UNAUTHORIZED: new ClientError("UNAUTHORIZED", 401),
};

export { ClientError, errors, middleware };