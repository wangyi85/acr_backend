const Users = require("../model/User");
const ACRLog = require('../model/ACRLog');
const Palinsesto = require('../model/Palinsesto');
const Counters = require('../model/Counter');
const md5 = require("md5");
const nodemailer = require('nodemailer');
const moment = require("moment");


exports.signup = async (req, res) => {
    const ID = req.body.id;
    const name = req.body.name;
    const email = req.body.email;
    const Gen_cod = req.body.gen_cod === '-' ? 0 : req.body.gen_cod;
    const Gen_txt = req.body.gen_txt;
    const Age_cod = req.body.age_cod === '-' ? 0 : req.body.age_cod;
    const Age_txt = req.body.age_txt;
    const Reg_cod = req.body.reg_cod === '-' ? 0 : req.body.reg_cod;
    const Reg_txt = req.body.reg_txt;
    const Area_cod = req.body.area_cod === '-' ? 0 : req.body.area_cod;
    const Area_txt = req.body.area_txt;
    const PV_cod = req.body.pv_cod === '-' ? 0 : req.body.pv_cod;
    const PV_txt = req.body.pv_txt;
    const AC_cod = req.body.ac_cod === '-' ? 0 : req.body.ac_cod;
    const AC_txt = req.body.ac_txt;
    const Prof_cod = req.body.prof_cod === '-' ? 0 : req.body.prof_cod;
    const Prof_txt = req.body.prof_txt;
    const Istr_cod = req.body.istr_cod === '-' ? 0 : req.body.istr_cod;
    const Istr_txt = req.body.istr_txt;
    const password = md5(req.body.password);
    const newUser = Users({
        _id: await getNextSequenceValue('users'),
        ID,
        name,
        email,
        Gen_cod,
        Gen_txt,
        Age_cod,
        Age_txt,
        Reg_cod,
        Reg_txt,
        Area_cod,
        Area_txt,
        PV_cod,
        PV_txt,
        AC_cod,
        AC_txt,
        Prof_cod,
        Prof_txt,
        Istr_cod,
        Istr_txt,
        weight_s: 1.0,
        password,
    });
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
    const longitude = req.body.longitude;
    const latitude = req.body.latitude;
    const location_address = req.body.locationAddress;
    const recorded_at = req.body.recorded_at; // Format DD/MM/YYYY HH:mm
    console.log(moment(recorded_at, 'DD/MM/YYYY HH:mm').utcOffset('+0100'));
    const newLog = ACRLog({
        user_id,
        uuid,
        imei,
        model,
        brand,
        acr_result,
        duration,
        longitude,
        latitude,
        location_address,
        recorded_at,
        f_recorded_at: (moment(recorded_at, 'DD/MM/YYYY HH:mm').utcOffset('+0100')),
        registered_at: (new Date()).toLocaleString('en-US', {hour12: false})
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

exports.getUsers = async (req, res) => {
    const users = (await Users.find({}, {__v: 0}).exec());
    res.send({
        status: 'success',
        users
    })
}

exports.getACRDetails = async (req, res) => {
    try {
        const acrDetails = await ACRLog.find(
            {latitude: {$exists: true, $ne: ''}, longitude: {$exists: true, $ne: ''}}, // Filter for non-empty latitudes and longitudes
            {__v: 0}
        ).sort({recorded_at: -1}); // Sort by recorded_at field in descending order

        res.send({
            status: 'success',
            acrDetails
        });
    } catch (error) {
        res.status(500).send({status: 'error', message: 'Failed to fetch ACR details'});
    }
};

exports.getACRDetailsByDate = async (req, res) => {
    try {
        const {date} = req.body; // Assuming the date is sent in the request body
        // Handle the date format conversion if necessary to match MongoDB date format

        // Use the date to fetch ACR details from MongoDB
        // Modify this part according to your database schema and retrieval logic
        // Assuming date is in the format 'dd/MM/yyyy', adjust the regex pattern accordingly
        const regexPattern = new RegExp(`^${date}`);
        console.log('Regex Pattern:', date); // Log the regex pattern
        // Query ACR details based on the regex pattern for recorded_at
        const acrDetails = await ACRLog.find({recorded_at: {$regex: date}});

        //  console.log(acrDetails);
        res.send({
            status: 'success',
            acrDetails,
        });
    } catch (error) {
        console.error('Error fetching ACR details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch ACR details by date',
        });
    }
};

exports.getACRDetailsByDateTimeslot = async (req, res) => {
    try {
        const {date} = req.body; // Assuming the date is sent in the request body

        // Assuming date is in the format 'dd/MM/yyyy'
        const [day, month, year] = date.split('/');
        const startDate = new Date(year, month - 1, day); // Month needs to be zero-based in JavaScript Date

        // Create time slot intervals (3 hours each)
        const timeSlots = [];
        for (let i = 0; i < 8; i++) {
            const startHour = i * 3;
            const endHour = startHour + 2;
            const timeSlot = {
                start: new Date(startDate).setHours(startHour, 0, 0, 0),
                end: new Date(startDate).setHours(endHour, 59, 59, 999),
                label: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:59`,
            };
            timeSlots.push(timeSlot);
        }
        console.log("timeSlots[0].start");
        console.log(timeSlots[0].start);
        const acrDetails = await ACRLog.find({
            recorded_at: {
                $gte: new Date(`${date} ${timeSlots[0].start}`), // Start of the first time slot
                $lte: new Date(`${date} ${timeSlots[timeSlots.length - 1].end}`), // End of the last time slot
            },
        });
        console.log("acrDetails");
        console.log(acrDetails);

        const groupedDetails = timeSlots.map((slot) => {
            const slotDetails = acrDetails.filter((detail) => {
                const recordedDate = new Date(detail.recorded_at);
                return recordedDate >= slot.start && recordedDate <= slot.end;
            });
            const groupedByChannel = {}; // Grouping by acr_result for each time slot
            slotDetails.forEach((detail) => {
                if (!groupedByChannel[detail.acr_result]) {
                    groupedByChannel[detail.acr_result] = 1;
                } else {
                    groupedByChannel[detail.acr_result]++;
                }
            });
            return {
                label: slot.label,
                data: groupedByChannel,
            };
        });

        console.log(groupedDetails);
        res.send({
            status: 'success',
            groupedDetails,
        });
    } catch (error) {
        console.error('Error fetching ACR details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch ACR details by date',
        });
    }
};

exports.getACRResults = async (req, res) => {
    let acrResults = [];
    const results = await ACRLog.aggregate([
        {
            $match: {acr_result: {$ne: 'NULL'}}
        },
        {
            $group: {_id: {'title': '$acr_result', 'date': '$recorded_at'}, total_count: {$sum: 1}}
        },
        {
            $sort: {'_id.title': 1}
        }
    ], {allowDiskUse: true}).exec();
    for (const item of results) {
        const users = await ACRLog.aggregate([
            {
                $match: {acr_result: {$eq: item._id.title}, recorded_at: {$eq: item._id.date}}
            },
            {
                $group: {_id: '$user_id'}
            },
        ], {allowDiskUse: true}).exec();
        const phones = await ACRLog.aggregate([
            {
                $match: {acr_result: {$eq: item._id.title}, recorded_at: {$eq: item._id.date}}
            },
            {
                $group: {_id: '$brand'}
            }
        ], {allowDiskUse: true}).exec();
        acrResults = [...acrResults, {
            title: item._id.title,
            date: item._id.date,
            total_count: item.total_count,
            user_count: users.length,
            phone_count: phones.length
        }];
    }
    res.send({
        status: 'success',
        acrResults
    })
}

exports.getUserCountByTime = async (req, res) => {
    const timeDistance = req.body.timeDistance;
    const date = req.body.date;
}

exports.getACRDetailsByDate = async (req, res) => {
    try {
        const {date} = req.body; // Assuming the date is sent in the request body
        // Handle the date format conversion if necessary to match MongoDB date format

        // Use the date to fetch ACR details from MongoDB
        // Modify this part according to your database schema and retrieval logic
        // Assuming date is in the format 'dd/MM/yyyy', adjust the regex pattern accordingly
        const regexPattern = new RegExp(`^${date}`);
        console.log('Regex Pattern:', date); // Log the regex pattern
        // Query ACR details based on the regex pattern for recorded_at
        const acrDetails = await ACRLog.find({recorded_at: {$regex: date}});

        //  console.log(acrDetails);
        res.send({
            status: 'success',
            acrDetails,
        });
    } catch (error) {
        console.error('Error fetching ACR details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch ACR details by date',
        });
    }
};

exports.getResultsByDateAndChannel = async (req, res) => {
    try {
        const {date, acr_result} = req.body; // Assuming date and acr_result are sent in the request body

        // Handle the date format conversion if necessary to match MongoDB date format

        // Create a regular expression for the date
        const dateRegexPattern = new RegExp(`^${date}`);

        // Query ACR details based on the regex pattern for recorded_at and acr_result
        const acrDetails = await ACRLog.find({
            recorded_at: {$regex: dateRegexPattern},
            acr_result: acr_result // Add acr_result filter
        });

        res.send({
            status: 'success',
            acrDetails,
        });
    } catch (error) {
        console.error('Error fetching ACR details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch ACR details by date',
        });
    }
};


exports.getACRDetailsByDateTimeslot = async (req, res) => {
    try {
        const {date} = req.body; // Assuming the date is sent in the request body

        // Assuming date is in the format 'dd/MM/yyyy'
        const [day, month, year] = date.split('/');
        const startDate = new Date(year, month - 1, day); // Month needs to be zero-based in JavaScript Date

        // Create time slot intervals (3 hours each)
        const timeSlots = [];
        for (let i = 0; i < 8; i++) {
            const startHour = i * 3;
            const endHour = startHour + 2;
            const timeSlot = {
                start: new Date(startDate).setHours(startHour, 0, 0, 0),
                end: new Date(startDate).setHours(endHour, 59, 59, 999),
                label: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:59`,
            };
            timeSlots.push(timeSlot);
        }
        console.log("timeSlots[0].start");
        console.log(timeSlots[0].start);
        const acrDetails = await ACRLog.find({
            recorded_at: {
                $gte: new Date(`${date} ${timeSlots[0].start}`), // Start of the first time slot
                $lte: new Date(`${date} ${timeSlots[timeSlots.length - 1].end}`), // End of the last time slot
            },
        });
        console.log("acrDetails");
        console.log(acrDetails);

        const groupedDetails = timeSlots.map((slot) => {
            const slotDetails = acrDetails.filter((detail) => {
                const recordedDate = new Date(detail.recorded_at);
                return recordedDate >= slot.start && recordedDate <= slot.end;
            });
            const groupedByChannel = {}; // Grouping by acr_result for each time slot
            slotDetails.forEach((detail) => {
                if (!groupedByChannel[detail.acr_result]) {
                    groupedByChannel[detail.acr_result] = 1;
                } else {
                    groupedByChannel[detail.acr_result]++;
                }
            });
            return {
                label: slot.label,
                data: groupedByChannel,
            };
        });

        console.log(groupedDetails);
        res.send({
            status: 'success',
            groupedDetails,
        });
    } catch (error) {
        console.error('Error fetching ACR details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch ACR details by date',
        });
    }
};

const getNextSequenceValue = async (sequenceName) => {
    const sequenceDocument = await Counters.findOneAndUpdate(
        {_id: sequenceName},
        {$inc: {sequence_value: 1}},
        {new: true, upsert: true}
    );
    return sequenceDocument.sequence_value;
}

exports.sendReminderEmailToInactiveUsers = async (req, res) => {
    try {
        const {date} = req.body; // Assuming the date is sent in the request body
        // Handle the date format conversion if necessary to match MongoDB date format

        // Use the date to fetch ACR details from MongoDB
        // Modify this part according to your database schema and retrieval logic
        // Assuming date is in the format 'dd/MM/yyyy', adjust the regex pattern accordingly
        const activeUsers = []
        const acrDetails = await ACRLog.find({recorded_at: {$regex: date}});
        acrDetails.forEach((detail) => {
            if (!activeUsers.includes(detail.user_id)) {
                activeUsers.push(detail.user_id);
            }
        });
        console.log("Active Users");
        console.log(activeUsers);

        // Find users who haven't sent data in the last 24 hours
        const inactiveUsers = await Users.find({
            _id: {$nin: activeUsers}
        });
        console.log("INACTIVE USERS");
        console.log(inactiveUsers);
        // Prepare and send emails to inactive users
        inactiveUsers.forEach(async (user) => {
            const {email, name} = user; // Assuming User model has 'email' and 'name' fields

            // Create transporter for sending emails
            const transporter = nodemailer.createTransport({
                host: 'smtps.aruba.it',
                port: 465,
                secure: true, // true for SSL
                auth: {
                    user: 'noreply@chartmusic.it',
                    pass: 'Norepchrt.2022',
                },
            });


            // Email content
            const mailOptions = {
                from: 'noreply@chartmusic.it',
                // to: email,
                to: 'antonio.trigiani@gmail.com',
                subject: 'RadioMonitor Reminder: Verifica invio dati',
                text: `Ciao ${name} ${email},\n\nQuesto messaggio per ricordarti di avviare l'app RadioMonitor. Sono passate 24 ore da quando abbiamo ricevuto il tuo ultimo invio. Ti chiediamo gentilmente se ti sia possibile avviare il riconoscimento chiudendo e riavviando l'applicazione o effettuando un doppio tap sullo schermo attendendo che il pulsante diventi di colore blu. Grazie davvero per la tua preziosa collaborazione!\n\nA presto, lo staff di RadioMonitor`,
            };

            // Send email
            // await transporter.sendMail(mailOptions);
            return res = "OK";
        });

        console.log('Reminder emails sent to inactive users.');
    } catch (error) {
        console.error('Error sending reminder emails:', error);
    }
};
// Helper function to get active user IDs who sent data in the last 6 hours
const getActiveUsersIds = async (dateBefore24Hours) => {
    try {

        // Find user IDs who sent data in the last 6 hours
        const activeUserIds = await ACRLog.distinct('user_id', {
            recorded_at: {$gte: dateBefore24Hours}
        });
        return activeUserIds;
    } catch (error) {
        console.error('Error fetching active user IDs:', error);
        return [];
    }
};



  exports.getPalinsestoByDateAndChannel = async (req, res) => {
    try {
        const { date, channel_name } = req.body; // Assuming date and acr_result are sent in the request body

        // Handle the date format conversion if necessary to match MongoDB date format

        // Create a regular expression for the date
        const dateRegexPattern = new RegExp(`^${date}`);

        // Query ACR details based on the regex pattern for recorded_at and acr_result
        const palDetails = await Palinsesto.find({
            day: { $regex: dateRegexPattern },
            "events.channel.name":channel_name // Add acr_result filter
        });

        res.send({
            status: 'success',
            palDetails,
        });
    } catch (error) {
        console.error('Error fetching PALINSESTO details by date:', error);
        res.status(500).send({
            status: 'error',
            message: 'Failed to fetch PALINSESTO details by date',
        });
    }
};

