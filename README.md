# Семестровый проект по курсу "Базы Данных"


## Сборка
```bash
docker build -t tpdb https://github.com/eadium/tpdb.git
docker run -p 5000:5000 -t tpdb
```

# Техническое задание

Тестовое задание для реализации проекта "Форумы" на курсе по базам данных в [Технопарке Mail.ru]([https://park.mail.ru).

Суть задания заключается в реализации API к базе данных проекта «Форумы» по документации к этому API.

Таким образом, на входе:

 * документация к API;

На выходе:

 * репозиторий, содержащий все необходимое для разворачивания сервиса в Docker-контейнере.

## Документация к API
Документация к API предоставлена в виде спецификации [OpenAPI](https://ru.wikipedia.org/wiki/OpenAPI_%28%D1%81%D0%BF%D0%B5%D1%86%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F%29): [swagger.yml](https://github.com/bozaro/tech-db-forum/blob/master/swagger.yml) или [Swager UI](https://tech-db-forum.bozaro.ru/)

## Требования к проекту
Проект должен включать в себя все необходимое для разворачивания сервиса в Docker-контейнере.

При этом:

 * файл для сборки Docker-контейнера должен называться Dockerfile и располагаться в корне репозитория;
 * реализуемое API должно быть доступно на 5000-ом порту по протоколу http;
 * допускается использовать любой язык программирования;
 * крайне не рекомендуется использовать ORM.

## Функциональное тестирование
Корректность API будет проверяться при помощи автоматического функционального тестирования.

Методика тестирования:

 * собирается Docker-контейнер из репозитория;
 * запускается Docker-контейнер;
 * запускается скрипт на Go, который будет проводить тестирование;
 * останавливается Docker-контейнер.

Скомпилированные программы для тестирования можно скачать по ссылкам:

 * [darwin_amd64.zip](https://bozaro.github.io/tech-db-forum/darwin_amd64.zip)
 * [linux_386.zip](https://bozaro.github.io/tech-db-forum/linux_386.zip)
 * [linux_amd64.zip](https://bozaro.github.io/tech-db-forum/linux_amd64.zip)
 * [windows_386.zip](https://bozaro.github.io/tech-db-forum/windows_386.zip)
 * [windows_amd64.zip](https://bozaro.github.io/tech-db-forum/windows_amd64.zip)

Для локальной сборки Go-скрипта достаточно выполнить команду:
```
go get -u -v github.com/bozaro/tech-db-forum
go build github.com/bozaro/tech-db-forum
```
После этого в текущем каталоге будет создан исполняемый файл `tech-db-forum`.

### Запуск функционального тестирования

Для запуска функционального тестирования нужно выполнить команду вида:
```
./tech-db-forum func -u http://localhost:5000/api -r report.html
```

Поддерживаются следующие параметры:

Параметр                              | Описание
---                                   | ---
-h, --help                            | Вывод списка поддерживаемых параметров
-u, --url[=http://localhost:5000/api] | Указание базовой URL тестируемого приложения
-k, --keep                            | Продолжить тестирование после первого упавшего теста
-t, --tests[=.*]                      | Маска запускаемых тестов (регулярное выражение)
-r, --report[=report.html]            | Имя файла для детального отчета о функциональном тестировании


### Запуск нагрузочного тестирования

Для запуска нагрузочного тестирования нужно выполнить команду вида:
```
./tech-db-forum perf -u http://localhost:5000/api
```

Поддерживаются следующие параметры:

Параметр                              | Описание
---                                   | ---
-h, --help                            |  Display help information
-u, --url |  Base url for testing API
--wait[=30]                           |  Wait before remote API make alive (while connection refused or 5XX error on base url)
--no-check                            |  Do not check version update
-t, --thread[=8]                      |  Number of threads for performance testing
--timeout[=1800]                      |  Fill timeout (sec)
-i, --state[=tech-db-forum.dat.gz]    |  State file with information about database objects
-o, --best                            |  File for best result
-v, --validate[=0.05]                 |  The probability of verifying the answer
-d, --duration[=-1]                   |  Test duration (sec)
-s, --step[=10]                       |  Sampling step (sec)
