'use strict';

const api = require("./messenger_handler/api_manager");
const sql = require("./database/sql_manager");
const logger = require("log4js").getLogger();

class User {
    /**
     *
     * @param id
     * @param first_name
     * @param last_name
     * @param facebook_id
     * @param gender
     * @param locale
     * @param is_registered
     */
    constructor(id, first_name, last_name, facebook_id, gender, locale, is_registered) {
        this.id = id;
        this.first_name = first_name;
        this.last_name = last_name;
        this.facebook_id = facebook_id;
        this.gender = gender;
        this.locale = locale;
        this.is_registered = !!is_registered;
    }

    /**
     *
     * @param pid
     * @return {Promise.<User>}
     */
    static async newFromFbId(pid) {
        const {body} = await api.getUserData(pid);
        let json = JSON.parse(body);
        logger.trace("Fetched user ", json);
        return User.fromJson(json);
    }

    /**
     *
     * @param json
     * @return {User}
     */
    static fromJson(json) {
        return new User(null, json["first_name"], json["last_name"], json["id"],
            json["gender"], json["locale"], false);
    }

    /**
     *
     * @param row
     * @returns {User}
     */
    static fromSql(row) {
        return new User(row["id"], row["first_name"], row["last_name"], row["facebook_id"],
            row["gender"], row["locale"], row["is_registered"]);
    }

    /**
     *
     * @param facebook_id
     * @returns {Promise<User>}
     */
    static async fromFacebookId(facebook_id) {
        let user = await sql.queryUserByFbId(facebook_id);
        if(user === null) {
            logger.trace(`Creating user from facebook_id: ${facebook_id}`);
            user = await User.newFromFbId(facebook_id);
            let {result} = await sql.insertUser(user);
            user.id = result.insertId;
        }

        return user;
    }

    /**
     *
     * @param linking_token
     * @returns {Promise<null|User>}
     */
    static async fromMessengerLinkingToken(linking_token) {
        try {
            const {body} = await api.getUserIdForLinkingToken(linking_token);
            const json = JSON.parse(body);
            if(json.recipient === undefined) {
                logger.error("Messenger linking token expired");
                return null;
            }
            return await User.fromFacebookId(json.recipient);
        } catch(e) {
            logger.error(e);
            return null;
        }
    }

    formatName(first_first = true) {
        if(first_first) {
            return this.first_name + " " + this.last_name;
        }
        return this.last_name + " " + this.first_name;
    }

    asArray(fields) {
        if(fields === undefined) {
            fields = User.ALL_FIELDS;
        }
        const array = [];

        for(let i = 0; i < fields.length; i++) {
            if(!this.hasOwnProperty(fields[i])) {
                throw Error(`Unknown property ${fields[i]}`);
            }
            array.push(this[fields[i]]);
        }

        return array;
    }
}

User.ALL_FIELDS = ["id", "first_name", "last_name", "facebook_id", "gender", "locale"];

module.exports.User = User;