const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const acrLogSchema = new Schema({
    user_id: Number,
    uuid: String,
    imei: String,
    model: String,
    brand: String,
    acr_result: String,
    duration: Number,
    recorded_at: String,
});

module.exports = mongoose.model('ACRLog', acrLogSchema, 'acr_log');