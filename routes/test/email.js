const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');
const nodemailer = require('nodemailer');
const _crypto = require('crypto');
const _redis = require('redis');
const redisClient = _redis.createClient({
    host: "127.0.0.1",
    port: 6379 // redis 기본 포트번호
});

// 이메일 인증코드 생성
function createKeyVerify() {
    var keyOne = _crypto.randomBytes(256).toString('hex').substr(100, 5);
    var keyTwo = _crypto.randomBytes(256).toString('base64').substr(50, 5);
    var keyVerify = keyOne + keyTwo;
    return keyVerify;
}

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kimmk0924@gmail.com',
        pass: 'dnrjwl0415'
    }
});

// 인증코드 만료 후 이메일로 인증코드 재전송
// 1. client가 아이디를 보낸다.
// 2. 존재하는 유저가 있다면 해당 이메일로 다시 인증코드 생성해서 전송

router.post("/", function (req, res, next) {

    let { id } = req.body;
    let verifyCode = createKeyVerify();

    let selectUserQuery =
        `
        SELECT *
        FROM user
        WHERE user_id = ?
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
            connection.query(selectUserQuery, [id], (err, selectedUser) => {
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
                    util.successTrue(status.OK, "존재하지 않는 회원입니다.", false)
                );
                connection.release();

            } else {
                // 이메일 전송 옵션 설정
                let mailOptions = {
                    from: 'kimmk0924@gmail.com',    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
                    to: selectedUser[0].user_email,                     // 수신 메일 주소
                    subject: '안녕하세요, 인증코드를 재전송 해드립니다',   // 제목
                    text: 'That was easy!',  // 내용
                    html: '<p>아래의 코드를 앱에서 입력해주세요 !</p>' +
                        "<h1>" + verifyCode + "</h1>"
                };

                // 이메일 전송
                transporter.sendMail(mailOptions, function (err, res) {
                    if (err) console.log(err);
                    else console.log('email has been sent.');
                    transporter.close();
                });

                // redis에 유저 아이디-인증코드 저장
                redisClient.set(id, verifyCode, function (err, data) {
                    if (err) {
                        console.log(err);
                        res.send("error " + err);
                        return;
                    } else {
                        redisClient.expire(id, 600); // 10분 뒤 만료
                    }
                });

                res.status(201).send(
                    util.successTrue(status.CREATED, "인증코드 재전송 성공", true)
                );
                connection.release();
                callback(null, "success re-send email");
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });


})

module.exports = router;