let mysqlRequests = require('./mysqlRequests')(null);

module.exports = class Auth {
    static apiGetSiteSettings (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let equipmentTypes = require('./config/equipmentTypes.json');
            let serviceTypes = require('./config/serviceTypes.json');
            resolve({
                status: 'success',
                data: {
                    agbPath: '/public/AGB.pdf',
                    authUser: authedUser,
                    equipmentTypes: equipmentTypes,
                    serviceTypes: serviceTypes,
                },
            })
        });
    }

    static auth (username, password) {
        return new Promise((resolve, reject) => {
            mysqlRequests.findUserByAuth(username, password)
                .then(function (data) {
                    resolve(data)
                });
        });
    }
};