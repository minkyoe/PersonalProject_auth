const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');
const _redis = require('redis');
const redisClient = _redis.createClient({
    host: "127.0.0.1",
    port: 6379 // redis 기본 포트번호
});

router.post("/", function (req, res, next) {

    let { email, key } = req.body;

    let selectUserQuery =
    `
        SELECT *
        FROM user
        WHERE user_email = ?
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
            // 가입된 유저인지 확인
            connection.query(selectUserQuery, [email], (err, selectedUser) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("select user error : " + err);
                } else callback(null, selectedUser, connection);
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length == 0) {
                res.status(200).send(
                    util.successTrue(status.OK, "가입되지 않은 회원입니다.", false)
                );
                connection.release();

            } else {
                redisClient.get(selectedUser[0].user_id, (err, reply) => {
                    if (err) console.log(err);
                    else {
                        if (reply == key) {
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

                                    redisClient.del(selectedUser[0].user_id, function (err, response) {
                                        if (response == 1) console.log("redis에서 토큰값 삭제 완료");
                                        else console.log("redis에서 토큰값 삭제 실패");
                                    });

                                    connection.release();
                                    callback(null, "success verify key");
                                }
                            });
                        } else if (reply == null) {
                            res.status(200).send(
                                util.successTrue(status.EXPIRED, "인증 코드가 만료되었습니다.", false)
                            );
                            connection.release();
                            callback(null, "인증 코드 만료");

                        } else {
                            res.status(200).send(
                                util.successTrue(status.NOT_CORRECT, "인증 코드가 일치하지 않습니다.", false)
                            );
                            connection.release();
                            callback(null, "인증 코드가 올바르지 않음");
                        }
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