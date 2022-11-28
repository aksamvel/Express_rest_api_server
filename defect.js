let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');

module.exports = class Defect {

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Defect.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            let entity = {
                equipmentId: body.equipmentId,
                description: body.description,
                contractId: body.contractId ? body.contractId : null,
            }

            entity.photo = '';
            if (files && files.photo) {
                let photoFile = files.photo.pop();
                entity.photo = photoFile.path;
            }
            else {
                reject({
                    status: 'error',
                    code: '10029',
                    errors: ['Photo missing'],
                });
            }

            mysqlRequests.createDefect(entity)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Defect create', entityType: 'defect', entityAction: 'create', entityId: data.data.defectId});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            mysqlRequests.requestDefects(body.equipmentId ? body.equipmentId : null)
                .then(function (data) {
                    resolve(data);
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.defect) {
                return reject({
                    status: 'error',
                    code: '10037',
                    errors: ['Defect id missing'],
                });
            }

            mysqlRequests.removeDefect(params.defect)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Defect delete', entityType: 'defect', entityAction: 'delete', entityId: params.defect});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.defect) {
                return reject({
                    status: 'error',
                    code: '10037',
                    errors: ['Defect id missing'],
                });
            }

            let errorData = Defect.apiValidateUpdateHandlerFields(body);
            if (errorData) {
                return reject(errorData);
            }

            let photo = null;
            if (files && files.photo) {
                let photoFile = files.photo.pop();
                photo = photoFile.path;
            }
            else if (body.photo) {
                photo = body.photo;
            }
            else {
                return reject({
                    status: 'error',
                    code: '10039',
                    errors: ['Photo missing'],
                });
            }

            mysqlRequests.updateDefect(body, params.defect, photo)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Defect update', entityType: 'defect', entityAction: 'update', entityId: params.defect});
                    resolve(data);
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }


    static apiValidateCreateHandlerFields(data) {
        if (!data.equipmentId || !data.description) {
            let fieldsErrors = [];

            if (!data.equipmentId) {
                fieldsErrors.push('Equipment id field missing');
            }
            if (!data.description) {
                fieldsErrors.push('Description field missing');
            }

            return {
                status: 'error',
                code: '10030',
                errors: fieldsErrors,
            };
        }


        if (data.description && data.description.length > 1024) {
            let fieldsErrors2 = [];
            fieldsErrors2.push('Description field length 2024 characters max');
            return {
                status: 'error',
                code: '10031',
                errors: fieldsErrors2,
            };
        }

        return false;
    }

    static apiValidateUpdateHandlerFields(data) {
        if (!data.equipmentId || !data.description) {
            let fieldsErrors = [];

            if (!data.equipmentId) {
                fieldsErrors.push('Equipment id field missing');
            }
            if (!data.description) {
                fieldsErrors.push('Description field missing');
            }

            return {
                status: 'error',
                code: '10030',
                errors: fieldsErrors,
            };
        }


        if (data.description && data.description.length > 1024) {
            let fieldsErrors2 = [];
            fieldsErrors2.push('Description field length 2024 characters max');
            return {
                status: 'error',
                code: '10031',
                errors: fieldsErrors2,
            };
        }

        return false;
    }
};