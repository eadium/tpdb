FROM ubuntu:18.04

MAINTAINER Andryukhov Artem

ENV DEBIAN_FRONTEND 'noninteractive'
RUN echo 'Europe/Moscow' > '/etc/timezone'


RUN apt-get -y update
RUN apt-get -y install wget
RUN echo 'deb http://apt.postgresql.org/pub/repos/apt/ bionic-pgdg main' >> /etc/apt/sources.list.d/pgdg.list
RUN apt-get install -y  gnupg2
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get -y update
RUN apt-get install -y sysstat
ENV PGVER 10
RUN apt-get install -y postgresql-10
RUN wget -qO- https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

 ENV WORK /opt/tp-db
WORKDIR $WORK

 COPY schema.pgsql schema.pgsql

 USER postgres

 RUN /etc/init.d/postgresql start &&\
    psql --echo-all --command "CREATE USER manager WITH SUPERUSER PASSWORD 'manager';" &&\
    createdb -O manager forum &&\
    psql --dbname=forum --echo-all --command 'CREATE EXTENSION IF NOT EXISTS citext;' &&\
    psql forum -f schema.pgsql &&\
    /etc/init.d/postgresql stop

RUN echo "local all  all    trust" >> /etc/postgresql/$PGVER/main/pg_hba.conf

RUN echo "listen_addresses='*'" >> /etc/postgresql/$PGVER/main/postgresql.conf

RUN echo "fsync = off" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "full_page_writes = off" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "default_statistics_target = 300" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "shared_buffers = 512MB" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "deadlock_timeout = 2s" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "random_page_cost = 1.0" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "wal_level = minimal" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "wal_writer_delay = 2000ms" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "effective_cache_size = 768MB" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "max_wal_senders = 0" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "work_mem = 16MB" >> /etc/postgresql/$PGVER/main/postgresql.conf &&\
    echo "maintenance_work_mem = 64MB" >> /etc/postgresql/$PGVER/main/postgresql.conf

USER root

ADD . $WORK/
RUN npm install

EXPOSE 5000

CMD service postgresql start && node server.js
