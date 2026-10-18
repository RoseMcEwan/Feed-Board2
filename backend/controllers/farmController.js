const models = require("../models/farmModel");

const getFarm = async (req, res) => {
  res.status(200).json(await models.getFarm(req.user.id));
};

// Setup remains a single atomic creation request.
const createFarm = async (req, res) => {
  res.status(201).json(await models.createFarm(req.user.id, req.farm, req.expectedVersion));
};

function mutation(resource, action, idParameter) {
  return async (req, res) => {
    const result = await models.mutateFarm(req.user.id, {
      resource, action, id: idParameter ? req.params[idParameter] : undefined,
      body: req.body,
    });
    res.status(action === "create" ? 201 : 200).json(result);
  };
}

module.exports = {
  getFarm, createFarm,
  updateFarm: mutation("farm", "update"),
  deleteFarm: mutation("farm", "delete"),
  createHerd: mutation("herds", "create"),
  updateHerd: mutation("herds", "update", "herdId"),
  deleteHerd: mutation("herds", "delete", "herdId"),
  createPaddock: mutation("paddocks", "create"),
  updatePaddock: mutation("paddocks", "update", "paddockId"),
  deletePaddock: mutation("paddocks", "delete", "paddockId"),
  createCrop: mutation("crops", "create"),
  updateCrop: mutation("crops", "update", "cropId"),
  deleteCrop: mutation("crops", "delete", "cropId"),
  putQueue: mutation("queues", "replace", "herdId"),
  deleteQueue: mutation("queues", "delete", "herdId"),
};

