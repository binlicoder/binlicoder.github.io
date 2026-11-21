CREATE TABLE editorial_terms (
  kind TEXT NOT NULL CHECK (kind IN ('categories', 'tags')),
  name TEXT NOT NULL,
  PRIMARY KEY (kind, name)
);
