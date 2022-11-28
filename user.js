let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');

module.exports = class User {

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            mysqlRequests.requestUsers()
                .then(function (data) {
                    resolve(data)
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.user) {
                return reject({
                    status: 'error',
                    code: '10010',
                    errors: ['user id missing'],
                });
            }

            mysqlRequests.removeUser(params.user)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'User delete', entityType: 'user', entityAction: 'delete', entityId: params.user});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!body.user) {
                return reject({
                    status: 'error',
                    code: '10007',
                    errors: ['User object missing'],
                });
            }

            let errorData = User.apiValidateCreateHandlerFields(body.user);
            if (errorData) {
                return reject(errorData)
            }

            mysqlRequests.createUser(body.user)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'User creation', entityType: 'user', entityAction: 'create', entityId: data.data.userId});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.user) {
                return reject({
                    status: 'error',
                    code: '10006',
                    errors: ['User id missing'],
                });
            }

            if (!body.user) {
                return reject({
                    status: 'error',
                    code: '10007',
                    errors: ['User object missing'],
                });
            }

            let errorData = User.apiValidateUpdateHandlerFields(body.user);
            if (errorData) {
                return reject(errorData)
            }

            mysqlRequests.updateUser(body.user, params.user)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'User update', entityType: 'user', entityAction: 'update', entityId: params.user});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiValidateCreateHandlerFields(user) {
        if (!user.role ||  !user.username || !user.password) {
            let fieldsErrors = [];
            if (!user.role) {
                fieldsErrors.push('user.role field missing');
            }
            if (!user.username) {
                fieldsErrors.push('user.username field missing');
            }
            if (!user.password) {
                fieldsErrors.push('user.password field missing');
            }
            return {
                status: 'error',
                code: '10006',
                errors: fieldsErrors,
            };
        }

        if (user.role.length > 64 || user.username.length > 64) {
            let fieldsErrors2 = [];
            if (user.role.length > 64) {
                fieldsErrors2.push('user.role field length 64 characters max');
            }
            if (user.username.length > 64) {
                fieldsErrors2.push('user.username field length 64 characters max');
            }
            return {
                status: 'error',
                code: '10008',
                errors: fieldsErrors2,
            };
        }
        return false;
    }

    static apiValidateUpdateHandlerFields(user) {
        if (!user.role || !user.username) {
            let fieldsErrors = [];
            if (!user.role) {
                fieldsErrors.push('user.role field missing');
            }
            if (!user.username) {
                fieldsErrors.push('user.username field missing');
            }

            return {
                status: 'error',
                code: '10006',
                errors: fieldsErrors,
            };
        }

        if (user.role.length > 64 || user.username.length > 64) {
            let fieldsErrors2 = [];
            if (user.role.length > 64) {
                fieldsErrors2.push('user.role field length 64 characters max');
            }
            if (user.username.length > 64) {
                fieldsErrors2.push('user.username field length 64 characters max');
            }
            return {
                status: 'error',
                code: '10008',
                errors: fieldsErrors2,
            };
        }
        return false;
    }

};