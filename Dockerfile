FROM php:8.2-apache
# Instalam extensiile necesare pentru a comunica cu baza de date
RUN docker-php-ext-install pdo pdo_mysql
# Activam modulul de rewrite pentru Apache (util pentru routing API viitor)
RUN a2enmod rewrite