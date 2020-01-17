const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const statusCode = require('../../module/statusCode');


// 유저관리
// 유저 정보들을 table형식으로 보여준다.
// 유저 정보 수정이나 삭제가 가능하다.


// 전체 유저 정보 조회
router.get('/', (req, res) => {

    let selectAllUserQuery =
    `
        SELECT user_idx, user_id, user_email
        FROM user
    `;

    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else {
                    callback(null, connection);
                }
            });
        },

        (connection, callback) => {
            connection.query(selectAllUserQuery, (err, allUserData) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("select all user error : " + err);
                } else {
                    callback(null, allUserData, connection);
                }
            });
        },

        (allUserData, connection, callback) => {
            if (allUserData.length == 0) {
                res.status(200).send(
                    util.successTrueNoData(statusCode.OK, "User가 없습니다.")
                );
                connection.release();
            } else {
                let resultArray = [];
                for (var i in allUserData) {
                    let arrayObject = {};
                    arrayObject.id = allUserData[i].user_id;
                    arrayObject.email = allUserData[i].user_email;
                    resultArray.push(arrayObject);
                }
                res.status(201).send(util.successTrue(statusCode.OK, '전체 유저 정보 조회 성공', resultArray));
                connection.release();
                callback(null, "success select all user");
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});



// 유저 정보 수정 
router.post('/edit/:target', (req, res) => {

    let selectUserQuery, updateUserQuery, message;
    let { before, after } = req.body; // 수정 전 값, 수정 후 값 (email OR id)
    if (req.params.target == "email") {
        selectUserQuery = `SELECT * FROM user WHERE user_email = ?`;
        updateUserQuery = `UPDATE user SET user_email = ? WHERE user_email = ?`;
    }
    else if (req.params.target == "id") {
        selectUserQuery = `SELECT * FROM user WHERE user_id = ?`;
        updateUserQuery = `UPDATE user SET user_id = ? WHERE user_id = ?`;
    }


    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else {
                    callback(null, connection);
                }
            });
        },

        (connection, callback) => {
            connection.query(selectUserQuery, [before], (err, selectedUser) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("select user error : " + err);
                } else {
                    callback(null, selectedUser, connection);
                }
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length == 0) {
                res.status(200).send(
                    util.successTrue(statusCode.OK, "해당 User가 없습니다.", false)
                );
                connection.release();
            } else {
                connection.query(selectUserQuery, [after], (err, selectedUserAfter) => {
                    if (err) {
                        res.status(200).send(
                            util.successFalse(statusCode.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("edit user info error : " + err);
                    } else {
                        callback(null, selectedUserAfter, connection);
                    }
                });
            }
        },

        (selectedUserAfter, connection, callback) => {
            if (selectedUserAfter.length == 0) {
                connection.query(updateUserQuery, [after, before], (err, data) => {
                    if (err) {
                        res.status(200).send(
                            util.successFalse(statusCode.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("edit user info error : " + err);
                    } else {
                        res.status(201).send(
                            util.successTrue(statusCode.CREATED, "유저 정보 수정 성공", true)
                        );
                        connection.release();
                        callback(null, "success edit user info");
                    }
                });
            } else {
                if (req.params.target == "id") message = "이미 존재하는 아이디입니다.";
                else if (req.params.target == "email") message = "이미 존재하는 이메일입니다.";
                res.status(200).send(
                    util.successTrue(statusCode.OK, message, false)
                );
                connection.release();
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});


// 유저 삭제
router.post('/delete', (req, res) => {

    let { id } = req.body;

    let selectUserQuery = `SELECT * FROM user WHERE user_id = ?`;
    let deleteUserQuery = `DELETE FROM user WHERE user_id = ?`;


    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else {
                    callback(null, connection);
                }
            });
        },

        (connection, callback) => {
            connection.query(selectUserQuery, [id], (err, selectedUser) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("select user error : " + err);
                } else {
                    callback(null, selectedUser, connection);
                }
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length == 0) {
                res.status(200).send(
                    util.successTrue(statusCode.OK, "해당 User가 존재하지 않습니다.", false)
                );
                connection.release();
            } else {
                connection.query(deleteUserQuery, [id], (err, data) => {
                    if (err) {
                        res.status(200).send(
                            util.successFalse(statusCode.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("delete user error : " + err);
                    } else {
                        res.status(201).send(
                            util.successTrue(statusCode.CREATED, "유저 삭제 성공", true)
                        );
                        connection.release();
                        callback(null, "success delete user");
                    }
                });
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});






module.exports = router;