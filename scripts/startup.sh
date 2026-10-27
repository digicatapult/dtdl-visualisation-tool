#!/bin/sh
set -e
knex migrate:latest --env production
exec dtdl-visualiser parse -p /sample/energygrid
