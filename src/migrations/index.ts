import * as migration_20260714_074436_initial from './20260714_074436_initial';
import * as migration_20260717_113344_schema_catchup from './20260717_113344_schema_catchup';

export const migrations = [
  {
    up: migration_20260714_074436_initial.up,
    down: migration_20260714_074436_initial.down,
    name: '20260714_074436_initial',
  },
  {
    up: migration_20260717_113344_schema_catchup.up,
    down: migration_20260717_113344_schema_catchup.down,
    name: '20260717_113344_schema_catchup'
  },
];
