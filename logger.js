let mysqlRequests = require('./mysqlRequests')(null);

module.exports = class Logger {
    static log(user, logParams) {
        logParams.authorId = user.id;
        logParams.username = user.username;
        mysqlRequests.createLog(logParams)
    }
};