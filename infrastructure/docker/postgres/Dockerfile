FROM postgres:15-alpine

COPY init.sql /docker-entrypoint-initdb.d/init.sql
COPY postgres.conf /etc/postgresql/postgresql.conf

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]