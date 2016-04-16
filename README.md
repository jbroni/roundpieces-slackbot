# roundpieces-slackbot
[![Build Status](https://travis-ci.org/jbroni/roundpieces-slackbot.svg?branch=master)](https://travis-ci.org/jbroni/roundpieces-slackbot)

A slack bot for administration of roundpieces.

## Setup
Make sure your environment is properly configured. You should set

- `ROUNDPIECES_API_KEY` to the slack bot API token
- `ROUNDPIECES_ADMIN_USERNAME` to the slack username of your roundpieces administrator
- `ROUNDPIECES_LIST_PATH` to the absolute path to your list of participants

Afterwards, simply start the bot by running `node bin/startBot.js`.

To start the bot through an SSH session, use `nohup node bin/startBot.js > log &`.

## What is roundpieces
Roundpieces is an anglicisation of the Danish word for [bread rolls](https://en.wikipedia.org/wiki/Bread_roll), rundstykker, which literally means round pieces.
