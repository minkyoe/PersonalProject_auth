const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');

router.post("/", function (req, res, next) {

    let { email, key } = req.body;

    let selectKeyQuery =
    `
        SELECT *
        FROM user
        WHERE user_email = ? and user_key = ?
    `;

    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else callback(null, connection);
            });
        },

        (connection, callback) => {
            connection.query(selectKeyQuery, [email, key], (err, selectedUser) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("select user key error : " + err);
                } else callback(null, selectedUser, connection);
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length == 0) {
                res.status(200).send(
                    util.successTrue(status.OK, "인증코드가 올바르지 않습니다.", false)
                );
                connection.release();

            } else { // key가 DB에 있는 user_key와 일치할 때
                let updateEmailVerifiedQuery = 'UPDATE user SET user_email_verified = 1 WHERE user_email = ?';
                connection.query(updateEmailVerifiedQuery, [email], (err, data) => {
                    if (err) {
                        res.status(200).send(
                            util.successFalse(status.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("key verify error : " + err);
                    } else {
                        res.status(201).send(
                            util.successTrue(status.CREATED, "이메일 인증 성공", true)
                        );
                        connection.release();
                        callback(null, "success verify key");
                    }
                });
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });


})

module.exports = router;