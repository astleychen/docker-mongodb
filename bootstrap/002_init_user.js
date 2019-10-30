var testdb = db.getSiblingDB('test');
testdb.createUser(
  {
    user: 'test',
    pwd:  'password',
    roles: [
      {
        role: 'root',
        db: 'admin'
      },
      {
        role: 'dbOwner',
        db: 'test'
      }
    ]
  }
);
testdb.getUsers();