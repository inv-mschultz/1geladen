import * as migration_20260714_074436_initial from './20260714_074436_initial';
import * as migration_20260717_113344_schema_catchup from './20260717_113344_schema_catchup';
import * as migration_20260717_122010_host_address_modes from './20260717_122010_host_address_modes';
import * as migration_20260720_145402_add_reactions from './20260720_145402_add_reactions';
import * as migration_20260805_101500_per_event_hosts from './20260805_101500_per_event_hosts';
import * as migration_20261008_112622_push_subscriptions from './20261008_112622_push_subscriptions';
import * as migration_20261009_083908_gallery_retention from './20261009_083908_gallery_retention';
import * as migration_20261009_120000_drop_legacy_image_sizes from './20261009_120000_drop_legacy_image_sizes';

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
    name: '20260720_145402_add_reactions',
  },
  {
    up: migration_20260805_101500_per_event_hosts.up,
    down: migration_20260805_101500_per_event_hosts.down,
    name: '20260805_101500_per_event_hosts',
  },
  {
    up: migration_20261008_112622_push_subscriptions.up,
    down: migration_20261008_112622_push_subscriptions.down,
    name: '20261008_112622_push_subscriptions',
  },
  {
    up: migration_20261009_083908_gallery_retention.up,
    down: migration_20261009_083908_gallery_retention.down,
    name: '20261009_083908_gallery_retention'
  },
  {
    up: migration_20261009_120000_drop_legacy_image_sizes.up,
    down: migration_20261009_120000_drop_legacy_image_sizes.down,
    name: '20261009_120000_drop_legacy_image_sizes',
  },
];
