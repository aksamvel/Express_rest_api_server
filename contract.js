let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');
let states = require('./states');

module.exports = class Contract {

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Contract.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            mysqlRequests.requestEquipment(body.equipmentId, authedUser.role)
                .then(function (data) {
                    return Contract.calculateSum(data.data.hourRate, data.data.dayRate, data.data.weekRate, body.dateEnd - body.dateStart);
                })
                .then(function (sum) {
                    let contract = {
                        equipmentId: body.equipmentId,
                        lessorId: body.lessorId,
                        dateStart: body.dateStart,
                        dateEnd: body.dateEnd,
                        status: states.contractState.NEW,
                        sum: sum,
                    }

                    mysqlRequests.createContract(contract)
                        .then(function (data) {
                            Logger.log(authedUser, {type: 'entity_log', message: 'Contract create', entityType: 'contract', entityAction: 'create', entityId: data.data.contractId});
                            resolve(data)
                        })
                        .catch(function (data) {
                            reject(data)
                        });
                });

        });
    }

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            mysqlRequests.requestContracts(authedUser.role)
                .then(function (data) {
                    resolve(data);
                });
        });
    }

    static apiGetSingleHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.contract) {
                return reject({
                    status: 'error',
                    code: '10034',
                    errors: ['Contract id missing'],
                });
            }

            mysqlRequests.requestContract(params.contract, authedUser.role)
                .then(function (data) {
                    resolve(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.contract) {
                return reject({
                    status: 'error',
                    code: '10034',
                    errors: ['Contract id missing'],
                });
            }

            let errorData = Contract.apiValidateUpdateHandlerFields(body);
            if (errorData) {
                return reject(errorData);
            }

            mysqlRequests.updateContract(body, params.contract)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Contract update', entityType: 'contract', entityAction: 'update', entityId: params.contract});
                    resolve(data);
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.contract) {
                return reject({
                    status: 'error',
                    code: '10034',
                    errors: ['Contract id missing'],
                });
            }

            mysqlRequests.removeContract(params.contract)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Contract delete', entityType: 'contract', entityAction: 'delete', entityId: params.contract});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static calculateSum(hourRate, dayRate, weekRate, period) {
        period /= 1000; // To seconds.
        let sum = 0;

        let hourSeconds = 3600;
        let daySeconds = hourSeconds * 24;
        let weekSeconds = daySeconds * 7;

        let weeks = Math.floor(period / weekSeconds);
        let days = Math.floor((period - (weeks * weekSeconds)) / daySeconds);
        let hours = Math.ceil((period - (weeks * weekSeconds) - (days * daySeconds)) / hourSeconds);

        if (weeks) {
            sum += weeks * weekRate;
        }

        if (days) {
            sum += days * dayRate;
        }

        if (hours) {
            sum += hours * hourRate;
        }

        return sum;
    }

    static apiValidateCreateHandlerFields(data) {
        if (!data.equipmentId || !data.lessorId || !data.dateStart || !data.dateEnd) {
            let fieldsErrors = [];

            if (!data.equipmentId) {
                fieldsErrors.push('Equipment id field missing');
            }
            if (!data.lessorId) {
                fieldsErrors.push('Lessor id field missing');
            }
            if (!data.dateStart) {
                fieldsErrors.push('Start date field missing');
            }
            if (!data.dateEnd) {
                fieldsErrors.push('End date field missing');
            }

            return {
                status: 'error',
                code: '10032',
                errors: fieldsErrors,
            };
        }

        if (data.dateStart.length > 20 || data.dateEnd.length > 20|| data.workAddress.length > 1024) {
            let fieldsErrors2 = [];
            if (data.dateStart.length > 20) {
                fieldsErrors2.push('Start date field length 20 characters max (timestamp in microseconds)');
            }
            if (data.dateEnd.length > 20) {
                fieldsErrors2.push('End date field length 20 characters max (timestamp in microseconds)');
            }
            if (data.workAddress.length > 1024) {
                fieldsErrors2.push('Work address field length 1024 characters max');
            }
            return {
                status: 'error',
                code: '10033',
                errors: fieldsErrors2,
            };
        }
        return false;
    }

    static apiValidateUpdateHandlerFields(data) {
        let fieldsErrors = [];
        if (data.dateStart && data.dateStart.length > 20) {
            fieldsErrors.push('Start date field length 20 characters max (timestamp in microseconds)');
        }
        if (data.dateEnd && data.dateEnd.length > 20) {
            fieldsErrors.push('End date field length 20 characters max (timestamp in microseconds)');
        }
        if (data.workAddress && data.workAddress.length > 1024) {
            fieldsErrors.push('Work address field length 1024 characters max');
        }
        if (data.status && !Object.values(states.contractState).includes(data.status)) {
            fieldsErrors.push('Unknown status');
        }
        if (data.sum && data.sum.length > 18) {
            fieldsErrors.push('Sum field length 18 characters max');
        }

        if (fieldsErrors.length) {
            return {
                status: 'error',
                code: '10036',
                errors: fieldsErrors,
            };
        }
        else {
            return false;
        }
    }

};