const { getForecast } = require("../services/weatherService");

// Gets the weather forecast for the validated farm coordinates.
const getWeather = async (req, res) => {
  const weather = await getForecast(req.coordinates);
  res.status(200).json(weather);
};

module.exports = { getWeather };
