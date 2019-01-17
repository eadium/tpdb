FROM ubuntu:18.04

ENV DEBIAN_FRONTEND 'noninteractive'
RUN echo 'Europe/Moscow' > '/etc/timezone'

#
# Установка postgresql
#
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

# Run the rest of the commands as the ``postgres`` user created by the ``postgres-$PGVER`` package when it was ``apt-get installed``

USER postgres

# Create a PostgreSQL role named ``docker`` with ``docker`` as the password and
# then create a database `docker` owned by the ``docker`` role.
# RUN /etc/init.d/postgresql start &&\
#     psql --command "CREATE USER manager WITH SUPERUSER PASSWORD 'manager';" &&\
#     psql -d postgres -c "CREATE EXTENSION IF NOT EXISTS CITEXT" &&\
#     psql < $WORK/schema.pgsql &&\
#     /etc/init.d/postgresql stop

RUN /etc/init.d/postgresql start &&\
    psql --echo-all --command "CREATE USER manager WITH SUPERUSER PASSWORD 'manager';" &&\
    createdb -O manager forum &&\
    psql --dbname=forum --echo-all --command 'CREATE EXTENSION IF NOT EXISTS citext;' &&\
    psql forum -f schema.pgsql &&\
    /etc/init.d/postgresql stop

# Adjust PostgreSQL configuration so that remote connections to the
# database are possible.
RUN echo "local all  all    trust" >> /etc/postgresql/$PGVER/main/pg_hba.conf

# And add ``listen_addresses`` to ``/etc/postgresql/$PGVER/main/postgresql.conf``
RUN echo "listen_addresses='*'" >> /etc/postgresql/$PGVER/main/postgresql.conf

# Back to the root user
USER root

ADD . $WORK/
RUN npm install

#
# Запускаем PostgreSQL и сервер
#
# RUN service postgresql start

# Объявлем порт сервера
EXPOSE 5000

CMD service postgresql start && node server.js
