CREATE TABLE oauth_flows(state TEXT PRIMARY KEY, proof TEXT NOT NULL, verifier TEXT NOT NULL, expires INTEGER NOT NULL, ticket TEXT UNIQUE, credential TEXT);
CREATE TABLE sessions(hash TEXT PRIMARY KEY, admin TEXT NOT NULL, credential TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE publish_jobs(id TEXT NOT NULL, admin TEXT NOT NULL, digest TEXT NOT NULL, slug TEXT NOT NULL, version TEXT NOT NULL, media TEXT NOT NULL, head TEXT NOT NULL, sha TEXT, stage TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(admin,id));
