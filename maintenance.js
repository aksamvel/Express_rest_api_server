let mysqlRequests = require('./mysqlRequests')(null);
let Equipment = require('./equipment');
let Logger = require('./logger');

module.exports = class Maintenance {

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Maintenance.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            let entity = {
                equipmentId: body.equipmentId,
                workHours: body.workHours,
                cost: body.cost,
                date: body.date ? body.date : null,
                description: body.description,
            }

            mysqlRequests.createMaintenance(entity)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Maintenance create', entityType: 'maintenance', entityAction: 'create', entityId: data.data.maintenanceId});

                    // Change current work hours in equipment.
                    if (entity.date) {
                        Equipment.apiUpdateHandler({equipmentId: body.equipmentId},{currentWorkHours: body.workHours}, [], authedUser);
                    }
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            mysqlRequests.requestMaintenances(authedUser.role, body.equipmentId ? body.equipmentId : null)
                .then(function (data) {
                    resolve(data);
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.maintenance) {
                return reject({
                    status: 'error',
                    code: '10027',
                    errors: ['Maintenance id missing'],
                });
            }

            mysqlRequests.removeMaintenance(params.maintenance)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Maintenance delete', entityType: 'maintenance', entityAction: 'delete', entityId: params.maintenance});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.maintenance) {
                return reject({
                    status: 'error',
                    code: '10027',
                    errors: ['Maintenance id missing'],
                });
            }

            let errorData = Maintenance.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData);
            }

            let entity = {
                equipmentId: body.equipmentId,
                workHours: body.workHours,
                cost: body.cost,
                date: body.date ? body.date : null,
                description: body.description,
            }

            mysqlRequests.updateMaintenance(entity, params.maintenance)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Maintenance update', entityType: 'maintenance', entityAction: 'update', entityId: params.maintenance});

                    // Change current work hours in equipment.
                    if (entity.date) {
                        Equipment.apiUpdateHandler({equipmentId: body.equipmentId},{currentWorkHours: body.workHours}, [], authedUser);
                    }
                    resolve(data);
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiValidateCreateHandlerFields(data) {
        if (!data.equipmentId || !data.workHours || !data.cost || !data.description) {
            let fieldsErrors = [];

            if (!data.equipmentId) {
                fieldsErrors.push('Equipment id field missing');
            }
            if (!data.workHours) {
                fieldsErrors.push('Work hours field missing');
            }
            if (!data.cost) {
                fieldsErrors.push('Cost field missing');
            }

            if (!data.description) {
                fieldsErrors.push('Description field missing');
            }

            return {
                status: 'error',
                code: '10025',
                errors: fieldsErrors,
            };
        }

        if ((data.date && data.date.length > 20) || data.cost.length > 20 || data.workHours.length > 11 || data.description.length > 1024) {
            let fieldsErrors2 = [];
            if (data.date && data.date.length > 20) {
                fieldsErrors2.push('Date field length 20 characters max (milliseconds)');
            }
            if (data.cost.length > 20) {
                fieldsErrors2.push('Cost field length 20 characters max (sum in cents)');
            }
            if (data.workHours.length > 11) {
                fieldsErrors2.push('Work hours field length 11 characters max');
            }
            if (data.description.length > 1024) {
                fieldsErrors2.push('Description field length 2024 characters max');
            }
            return {
                status: 'error',
                code: '10026',
                errors: fieldsErrors2,
            };
        }
        return false;
    }
};