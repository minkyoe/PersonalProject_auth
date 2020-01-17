const express = require('express');
const router = express.Router();
const async = require('async');
const _crypto = require('crypto');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');
const nodemailer = require('nodemailer');
const secretEmail = require('../../config/email');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: secretEmail.user,
        pass: secretEmail.pass
    }
});

// 임시비밀번호 생성
function createTempPwd() {
    var keyOne = _crypto.randomBytes(256).toString('hex').substr(100, 5);
    var keyTwo = _crypto.randomBytes(256).toString('base64').substr(50, 5);
    var tempPwd = keyOne + keyTwo;
    return tempPwd;
}

// 비밀번호 찾기
// 1. client에서 user_id 보내줌
// 2. db에 일치하는 id 있으면 해당 이메일로 임시비밀번호 보내기
// 3. 임시비밀번호로 암호화해서 salt와 함께 db update
router.post('/', (req, res) => {

    let { id } = req.body;
    let tempPwd = createTempPwd();
    let salt = _crypto.randomBytes(64).toString('base64');
    let email;

    let selectUserQuery =
    `
        SELECT * 
        FROM user 
        WHERE user_id = ?
    `;

    let updateUserQuery =
    `
        UPDATE user
        SET user_pwd = ?, user_pwd_salt = ?
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
                    callback("find pwd error : " + err);
                } else callback(null, selectedUser, connection);
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length == 0) {
                res.status(200).send(
                    util.successTrue(status.OK, "일치하는 ID가 없습니다.", false)
                );
                connection.release();

            } else {
                email = selectedUser[0].user_email;

                // 이메일 전송 옵션 설정
                let mailOptions = {
                    from: secretEmail.user,    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
                    to: email,                     // 수신 메일 주소
                    subject: '안녕하세요, 임시비밀번호 발급해드립니다.',   // 제목
                    text: 'That was easy!',  // 내용
                    html: '<p>아래의 임시비밀번호로 로그인해주세요 !</p>' +
                        "<h1>" + tempPwd + "</h1>"
                };

                // 이메일 전송
                transporter.sendMail(mailOptions, function (err, res) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('email has been sent.');
                    }
                    transporter.close();
                });
                callback(null, connection);
            }
        },

        (connection, callback) => {
            tempPwd = _crypto.pbkdf2Sync(tempPwd, salt, 420000, 32, 'sha512').toString('base64');
            connection.query(updateUserQuery, [tempPwd, salt, id], (err, data) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("find pwd errorrrr : " + err);
                } else {
                    res.status(201).send(
                        util.successTrue(status.OK, "비밀번호 찾기 성공", true)
                    );
                    connection.release();
                    callback(null, "success find pwd");
                }
            });
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});



module.exports = router;