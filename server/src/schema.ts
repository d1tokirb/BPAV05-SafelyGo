// Versioned, transactionally applied SQL. Every tenant-owned row references its campus.
export const migrations = [
  {
    version: 1,
    sql: `
CREATE TABLE users(id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE campuses(id uuid PRIMARY KEY,name text NOT NULL,domain text NOT NULL,website text NOT NULL,latitude double precision NOT NULL,longitude double precision NOT NULL,radius_m integer NOT NULL DEFAULT 1500,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),join_code text UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE memberships(user_id uuid REFERENCES users ON DELETE CASCADE,campus_id uuid REFERENCES campuses ON DELETE CASCADE,role text NOT NULL CHECK(role IN ('student','staff','owner')),PRIMARY KEY(user_id,campus_id));
CREATE TABLE sessions(token_hash text PRIMARY KEY,user_id uuid REFERENCES users ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE TABLE auth_codes(id uuid PRIMARY KEY,user_id uuid REFERENCES users ON DELETE CASCADE,purpose text NOT NULL CHECK(purpose IN ('verify','reset')),code_hash text NOT NULL,attempts integer NOT NULL DEFAULT 0,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX auth_code_user ON auth_codes(user_id,purpose,created_at DESC);
CREATE TABLE reports(id uuid PRIMARY KEY,campus_id uuid REFERENCES campuses ON DELETE CASCADE,author_id uuid REFERENCES users ON DELETE SET NULL,title text NOT NULL,description text NOT NULL,category text NOT NULL CHECK(category IN ('lighting','hazard','suspicious','harassment','theft','other')),severity text NOT NULL CHECK(severity IN ('low','medium','high')),latitude double precision NOT NULL,longitude double precision NOT NULL,status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','resolved','dismissed')),public_summary text,staff_note text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX reports_campus ON reports(campus_id,created_at DESC);
CREATE TABLE emergency_contacts(id uuid PRIMARY KEY,campus_id uuid REFERENCES campuses ON DELETE CASCADE,name text NOT NULL,phone text NOT NULL,description text NOT NULL DEFAULT '',priority integer NOT NULL DEFAULT 10);
CREATE INDEX directory_campus ON emergency_contacts(campus_id,priority);
CREATE TABLE contacts(id uuid PRIMARY KEY,requester_id uuid REFERENCES users ON DELETE CASCADE,recipient_id uuid REFERENCES users ON DELETE CASCADE,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),created_at timestamptz NOT NULL DEFAULT now(),CHECK(requester_id <> recipient_id));
CREATE UNIQUE INDEX contact_pair ON contacts(LEAST(requester_id,recipient_id),GREATEST(requester_id,recipient_id));
CREATE TABLE sharing_sessions(id uuid PRIMARY KEY,owner_id uuid REFERENCES users ON DELETE CASCADE,expires_at timestamptz NOT NULL,stopped_at timestamptz,latitude double precision,longitude double precision,accuracy double precision,updated_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX sharing_owner ON sharing_sessions(owner_id);
CREATE TABLE sharing_recipients(session_id uuid REFERENCES sharing_sessions ON DELETE CASCADE,user_id uuid REFERENCES users ON DELETE CASCADE,PRIMARY KEY(session_id,user_id));
CREATE TABLE alerts(id uuid PRIMARY KEY,campus_id uuid REFERENCES campuses ON DELETE CASCADE,title text NOT NULL,body text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit(id bigserial PRIMARY KEY,campus_id uuid REFERENCES campuses ON DELETE CASCADE,actor_id uuid REFERENCES users ON DELETE SET NULL,action text NOT NULL,target_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE mail_outbox(id uuid PRIMARY KEY,recipient text NOT NULL,subject text NOT NULL,body text NOT NULL,attempts integer NOT NULL DEFAULT 0,next_attempt timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE rate_limits(key text PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL);
`,
  },
  {
    version: 2,
    sql: `ALTER TABLE audit ADD COLUMN operator_name text, ADD COLUMN review_note text;`,
  },
  {
    version: 3,
    sql: `ALTER TABLE campuses ADD COLUMN emergency_phone text NOT NULL DEFAULT '', ADD COLUMN support_email text NOT NULL DEFAULT '';
CREATE TABLE contact_invitations(id uuid PRIMARY KEY,requester_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,recipient_email text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '14 days',UNIQUE(requester_id,recipient_email));`,
  },
  {
    version: 4,
    sql: `ALTER TABLE audit ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;`,
  },
  {
    version: 5,
    sql: `ALTER TABLE reports ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX report_request_identity ON reports(campus_id,author_id,client_request_id) WHERE client_request_id IS NOT NULL;`,
  },
];
