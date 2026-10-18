const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const farmController = require("../controllers/farmController");
const calculationController = require("../controllers/calculationController");
const weatherController = require("../controllers/weatherController");
const {
  requireAuth, requireCsrf, accountLimit, emailLimit, weatherLimit, calculationLimit,
  validateCreateUser, validateLogin, validateFarmBody, validateCalculationBody, validateWeather,
} = require("../middleware/middleware");

//User
router.get("/auth/session", authController.getSession);
router.post("/auth/register", accountLimit, requireCsrf, validateCreateUser, emailLimit, authController.register);
router.post("/auth/login", accountLimit, requireCsrf, validateLogin, emailLimit, authController.login);
router.post("/auth/logout", requireAuth, requireCsrf, authController.logout);

//Farm
router.get("/farm", requireAuth, farmController.getFarm);
router.post("/farm", requireAuth, requireCsrf, validateFarmBody, farmController.createFarm);
router.patch("/farm", requireAuth, requireCsrf, farmController.updateFarm);
router.delete("/farm", requireAuth, requireCsrf, farmController.deleteFarm);

//herds
router.post("/farm/herds", requireAuth, requireCsrf, farmController.createHerd);
router.patch("/farm/herds/:herdId", requireAuth, requireCsrf, farmController.updateHerd);
router.delete("/farm/herds/:herdId", requireAuth, requireCsrf, farmController.deleteHerd);

//paddocks
router.post("/farm/paddocks", requireAuth, requireCsrf, farmController.createPaddock);
router.patch("/farm/paddocks/:paddockId", requireAuth, requireCsrf, farmController.updatePaddock);
router.delete("/farm/paddocks/:paddockId", requireAuth, requireCsrf, farmController.deletePaddock);

//crops
router.post("/farm/crops", requireAuth, requireCsrf, farmController.createCrop);
router.patch("/farm/crops/:cropId", requireAuth, requireCsrf, farmController.updateCrop);
router.delete("/farm/crops/:cropId", requireAuth, requireCsrf, farmController.deleteCrop);

//queue
router.put("/farm/queues/:herdId", requireAuth, requireCsrf, farmController.putQueue);
router.delete("/farm/queues/:herdId", requireAuth, requireCsrf, farmController.deleteQueue);

// Draft previews use the same protected route pattern.
router.post("/farm/calculate", requireAuth, requireCsrf, calculationLimit, validateCalculationBody, calculationController.calculate);

// Weather
router.get("/weather", requireAuth, weatherLimit, validateWeather, weatherController.getWeather);

module.exports = router;

