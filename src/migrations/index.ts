import * as migration_20260714_074436_initial from './20260714_074436_initial';
import * as migration_20260717_113344_schema_catchup from './20260717_113344_schema_catchup';
import * as migration_20260717_122010_host_address_modes from './20260717_122010_host_address_modes';
import * as migration_20260720_145402_add_reactions from './20260720_145402_add_reactions';

export const migrations = [
  {
    up: migration_20260714_074436_initial.up,
    down: migration_20260714_074436_initial.down,
    name: '20260714_074436_initial',
  },
  {
    up: migration_20260717_113344_schema_catchup.up,
    down: migration_20260717_113344_schema_catchup.down,
    name: '20260717_113344_schema_catchup',
  },
  {
    up: migration_20260717_122010_host_address_modes.up,
    down: migration_20260717_122010_host_address_modes.down,
    name: '20260717_122010_host_address_modes',
  },
  {
    up: migration_20260720_145402_add_reactions.up,
    down: migration_20260720_145402_add_reactions.down,
    name: '20260720_145402_add_reactions'
  },
];
