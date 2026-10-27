#!/bin/sh
npx knex migrate:latest --env production
dtdl-visualiser parse -p /sample/energygrid
