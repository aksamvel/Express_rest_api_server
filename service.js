let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');
let states = require('./states');

module.exports = class Service {

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Service.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            mysqlRequests.createService(body)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Service create', entityType: 'service', entityAction: 'create', entityId: data.data.serviceId});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let contractId = null;
            if (body.contractId) {
                contractId = body.contractId;
            }
            mysqlRequests.requestServices(authedUser.role, contractId)
                .then(function (data) {
                    resolve(data);
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.service) {
                return reject({
                    status: 'error',
                    code: '10042',
                    errors: ['Service id missing'],
                });
            }

            let errorData = Service.apiValidateUpdateHandlerFields(body);
            if (errorData) {
                return reject(errorData);
            }

            mysqlRequests.updateService(body, params.service)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Service update', entityType: 'service', entityAction: 'update', entityId: params.service});
                    resolve(data);
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.service) {
                return reject({
                    status: 'error',
                    code: '10042',
                    errors: ['Service id missing'],
                });
            }

            mysqlRequests.removeService(params.service)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Service delete', entityType: 'service', entityAction: 'delete', entityId: params.service});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiValidateCreateHandlerFields(data) {
        if (!data.contractId || !data.type || !data.sum) {
            let fieldsErrors = [];

            if (!data.contractId) {
                fieldsErrors.push('Contract id field missing');
            }
            if (!data.type) {
                fieldsErrors.push('Type field missing');
            }
            if (!data.sum) {
                fieldsErrors.push('Sum field missing');
            }

            return {
                status: 'error',
                code: '10040',
                errors: fieldsErrors,
            };
        }

        let fieldsErrors2 = [];
        if (data.type && data.type.length > 512) {
            fieldsErrors2.push('Type field length 512 characters max');
        }
        if (data.description && data.description.length > 1024) {
            fieldsErrors2.push('End date field length 20 characters max (timestamp in microseconds)');
        }
        if (data.sum && data.sum.length > 20) {
            fieldsErrors2.push('Sum field length 17 characters max (sum in euro)');
        }
        if (fieldsErrors2.length) {
            return {
                status: 'error',
                code: '10041',
                errors: fieldsErrors2,
            };
        }
        return false;
    }

    static apiValidateUpdateHandlerFields(data) {
        let fieldsErrors2 = [];
        if (data.type && data.type.length > 512) {
            fieldsErrors2.push('Type field length 512 characters max');
        }
        if (data.description && data.description.length > 1024) {
            fieldsErrors2.push('End date field length 20 characters max (timestamp in microseconds)');
        }
        if (data.sum.length > 20) {
            fieldsErrors2.push('Sum field length 17 characters max (sum in euro)');
        }
        if (fieldsErrors2.length) {
            return {
                status: 'error',
                code: '10041',
                errors: fieldsErrors2,
            };
        }
        return false;
    }

};