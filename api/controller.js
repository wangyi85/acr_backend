const Users = require("../model/User");
const ACRLog = require('../model/ACRLog');
const Counters = require('../model/Counter');
const md5 = require("md5");

exports.signup = async (req, res) => {
    const name = req.body.name;
    const last_name = req.body.last_name;
    const gender = req.body.gender;
    const email = req.body.email;
    const age = req.body.age;
    const password = md5(req.body.password);
    const newUser = Users({ _id: await getNextSequenceValue('users'), name, last_name, gender, age, email, password});
    if ((await Users.find({email}, {_id: 0, __v: 0}).exec()).length > 0) {
        res.send({
            status: 'already exists',
            comment: 'Email has already existed'
        });
    } else {
        const result = await newUser.save();
        if (result !== undefined) {
            res.send({
                status: 'success'
            })
        } else {
            res.send({
                status: 'Error Found'
            })
        }
    }
}

exports.login = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const user = (await Users.find({email}, {__v: 0}).exec())[0];
    if (user !== undefined) {
        if (md5(password) === user.password) {
            res.send({
                status: 'success',
                user: user
            })
        } else {
            res.send({
                status: 'wrong password',
                comment: 'Password is not matching'
            })
        }
    } else {
        res.send({
            status: 'not registered',
            comment: 'user is not registered'
        })
    }
}

exports.registerACRResult = async (req, res) => {
    const user_id = req.body.user_id;
    const uuid = req.body.uuid;
    const imei = req.body.imei;
    const model = req.body.model;
    const brand = req.body.brand;
    const acr_result = req.body.acr_result;
    const duration = req.body.duration;
    const recorded_at = req.body.recorded_at;
    const newLog = ACRLog({
        user_id,
        uuid,
        imei,
        model,
        brand,
        acr_result,
        duration,
        recorded_at,
        registered_at: (new Date()).toLocaleString('en-US')
    });
    const result = await newLog.save();
    if (result !== undefined) {
        res.send({
            status: 'success'
        });
    } else {
        res.send({
            status: 'error',
            comment: 'DB Error'
        });
    }
}

const getNextSequenceValue = async (sequenceName) => {
    const sequenceDocument = await Counters.findOneAndUpdate(
        {_id: sequenceName},
        {$inc: {sequence_value: 1}},
        {new: true, upsert: true}
    );
    return sequenceDocument.sequence_value;
}