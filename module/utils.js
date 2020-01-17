const utils = {
    successTrue: (status, message, data) => {
        return {
            status: status,
            message: message,
            result: data
        }
    },
    successTrueNoData: (status, message) => { // success이지만 보내줄 data가 없을 때
        return {
            status: status,
            message: message
        }
    },
    successFalse: (status, message) => {
        return {
            status: status,
            message: message
        }
    },
};

module.exports = utils;