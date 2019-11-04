# Docker-MongoDB

This is a public repo that collects all about MongoDB containers development and orchestration for dev and prodcution.

## Environment

```bash
$ sw_vers
ProductName:	Mac OS X
ProductVersion:	10.15
BuildVersion:	19A602

$ docker --version
Docker version 19.03.4, build 9013bf5

$ docker-compose --version
docker-compose version 1.24.1, build 4667896b
```

## Containerization

Currently, we are not creating MongoDB images on our own but leveraging the upstream images.

1. Official Image packaging for MongoDB
   - [mongo](https://hub.docker.com/_/mongo)
2. Bitnami MongoDB Docker Image
   - [bitnami/mongodb](https://hub.docker.com/r/bitnami/mongodb)

## Orchestration

By default we are creating a MongoDB Replica Set without sharding support.

### Bitnami

If you'd like to utilize Bitnami MongoDB images, you can simply run below commands in `./bitnami` folder.
For official MongoDB images, please follow next section to begin the deployment.

```bash
$ docker-compose up -d
```

For configurations, refer to:
https://github.com/bitnami/bitnami-docker-mongodb/blob/master/README.md

### Enforce Keyfile Access Control for Replica Set

https://docs.mongodb.com/manual/tutorial/enforce-keyfile-access-control-in-existing-replica-set/#create-a-keyfile

```bash
$ openssl rand -base64 756 > mongod-keyfile
$ chmod 600 mongod-keyfile
```

### Deploy a Replica Set

Follow below steps to create, configure, and failover tests.

```bash
$ docker-compose up -d
```

You will see all of containers are running as below:

```bash
CONTAINER ID        IMAGE                     COMMAND                  CREATED             STATUS              PORTS                      NAMES
4a1c93632ff5        mongoclient/mongoclient   "./entrypoint.sh nod…"   4 seconds ago       Up 3 seconds        0.0.0.0:8080->3000/tcp     docker-mongodb_mongo-client_1
c6e69c5aa4fb        mongo-express             "tini -- /docker-ent…"   4 seconds ago       Up 3 seconds        0.0.0.0:8081->8081/tcp     docker-mongodb_mongo-express_1
f202eedb5229        mongo:4.2.1-bionic        "docker-entrypoint.s…"   5 seconds ago       Up 4 seconds        0.0.0.0:27017->27017/tcp   mongodb-primary
55b5cdfff154        mongo:4.2.1-bionic        "docker-entrypoint.s…"   6 seconds ago       Up 5 seconds        0.0.0.0:27018->27017/tcp   mongodb-secondary
9d2ed21f14f6        mongo:4.2.1-bionic        "docker-entrypoint.s…"   7 seconds ago       Up 6 seconds        0.0.0.0:27019->27017/tcp   mongodb-arbiter
```

### Enable Replication
```bash
$ docker-compose exec mongodb-primary mongo admin -u root -p password /bootstrap/000_init_replicaSet.js
```

You will see logs from mongodb-primary if the initialization succeeded:

```bash
MongoDB shell version v4.2.1
connecting to: mongodb://127.0.0.1:27017/admin?compressors=disabled&gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("979d21ae-2dfa-4c7e-a770-e42bc832a00c") }
MongoDB server version: 4.2.1
```

Check the replication configuration and status.

```bash
$ docker-compose exec mongodb-primary mongo admin -u root -p password --eval "rs.status()"

MongoDB shell version v4.2.1
connecting to: mongodb://127.0.0.1:27017/admin?compressors=disabled&gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("30165ec0-fe49-4409-84b6-fa985902e8de") }
MongoDB server version: 4.2.1
{
        "set" : "rs0",
        "date" : ISODate("2019-10-30T06:22:30.273Z"),
        "myState" : 1,
        "term" : NumberLong(1),
        "syncingTo" : "",
        "syncSourceHost" : "",
        "syncSourceId" : -1,
        "heartbeatIntervalMillis" : NumberLong(2000),
        "majorityVoteCount" : 2,
        "writeMajorityCount" : 2,
        "lastStableRecoveryTimestamp" : Timestamp(1572416490, 1),
        "lastStableCheckpointTimestamp" : Timestamp(1572416490, 1),
        ...
        "members" : [
                {
                        "_id" : 0,
                        "name" : "mongodb-primary:27017",
                        "ip" : "172.19.0.4",
                        "health" : 1,
                        "state" : 1,
                        "stateStr" : "PRIMARY",
                        "uptime" : 494,
                        "lastHeartbeatMessage" : ""
                },
                {
                        "_id" : 1,
                        "name" : "mongodb-secondary:27017",
                        "ip" : "172.19.0.3",
                        "health" : 1,
                        "state" : 2,
                        "stateStr" : "SECONDARY",
                },
                {
                        "_id" : 2,
                        "name" : "mongodb-arbiter:27017",
                        "ip" : "172.19.0.2",
                        "health" : 1,
                        "state" : 7,
                        "stateStr" : "ARBITER",
                }
        ],
        "ok" : 1,
        "$clusterTime" : {
                "clusterTime" : Timestamp(1572416550, 1),
                "signature" : {
                        "hash" : BinData(0,"xQZmkJLCj+cm55mXz/BtZsyPl4w="),
                        "keyId" : NumberLong("6753476369448960002")
                }
        },
        "operationTime" : Timestamp(1572416550, 1)
}
```

### Failover Tests

By default, mongodb-primary is the primary node in the repluca set, you can stop it and test the failover process.

```bash
$ docker-compose stop mongodb-primary
```

If you check logs from mongodb-secondary, primary is not found now.

```bash
2019-10-30T06:27:33.340+0000 I  CONNPOOL [Replication] Connecting to mongodb-primary:27017
2019-10-30T06:27:34.004+0000 I  NETWORK  [ftdc] getaddrinfo("mongodb-primary") failed: Name or service not known
2019-10-30T06:27:35.003+0000 I  NETWORK  [ftdc] getaddrinfo("mongodb-primary") failed: Name or service not known
2019-10-30T06:27:35.018+0000 I  CONNPOOL [RS] Connecting to mongodb-primary:27017
2019-10-30T06:27:35.313+0000 I  REPL_HB  [replexec-2] Heartbeat to mongodb-primary:27017 failed after 2 retries, response status: HostUnreachable: Error connecting to mongodb-primary:27017 :: caused by :: Could not find address for mongodb-primary:27017: SocketException: Host not found (authoritative)
2019-10-30T06:27:36.005+0000 I  NETWORK  [ftdc] getaddrinfo("mongodb-primary") failed: Name or service not known
```

Login to `mongodb-secondary`, you will see that it's become primary now.

```bash
$ docker-compose exec mongodb-secondary mongo admin -u root -p password

...
rs0:PRIMARY>
```

You can also force one of secondary nodes to primary by using `stepDown` method.

```bash
$ docker-compose exec mongodb-secondary mongo admin -u root -p password --eval "rs.stepDown()"
```

## Mongo Clients

1. [Mongo Express](https://github.com/mongo-express/mongo-express)
   - Web-based MongoDB admin interface, written with Node.js and express
2. [NoSQLClient](https://github.com/nosqlclient/nosqlclient)
   - Cross-platform and self hosted, easy to use, intuitive mongodb management tool

## Mongo Tests

We're going to add relevant tests for a MongoDB Replica Set soon.

## References

1. [docker-composeでMongoDBのReplicaSetを構築する](https://qiita.com/usabarashi/items/3854a1da0e47feb93ba0)
2. [Deploy a Replica Set](https://docs.mongodb.com/manual/tutorial/deploy-replica-set/)
3. [Force a Member to Become Primary](https://docs.mongodb.com/manual/tutorial/force-member-to-be-primary/)
4. [Read Preference](https://docs.mongodb.com/manual/core/read-preference/)
5. [Mongo Express](https://github.com/mongo-express/mongo-express)
6. [NoSQLClient](https://github.com/nosqlclient/nosqlclient)
7. [Update Replica Set to Keyfile Authentication](https://docs.mongodb.com/manual/tutorial/enforce-keyfile-access-control-in-existing-replica-set/)
