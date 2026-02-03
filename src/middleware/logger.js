const moment = require("moment");
exports.logger = function (req, res, next) {
  var dateTime = moment().format("DD:MM:YYYY HH:mm:ss");
  console.log(
    `${req.method} - ${req.path} - time: ${dateTime} - body: ${JSON.stringify(
      req.body
    )}`
  );
  next();
};
