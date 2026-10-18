const { calculateFarm } = require("../calculations/calculateFarm");

// Returns the calculated farm preview for the validated draft sent by the UI.
const calculate = (req, res) => {
  res.status(200).json(calculateFarm(req.calculation));
};

module.exports = { calculate };
