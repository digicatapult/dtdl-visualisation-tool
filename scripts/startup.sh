#!/bin/sh
npx knex migrate:latest --env production
dtdl-visualiser parse -p /sample/energygrid
# FAKE_AWS_SECRET_KEY=nHuIWTOnsrSSPQQjnYS2MBxFMcOQGsJ75ol3tMC8
