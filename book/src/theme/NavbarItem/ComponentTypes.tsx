import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import AuthNavbarItem from '@site/src/components/Auth/AuthNavbarItem';

// Register a custom navbar item type usable as { type: 'custom-authNavbarItem' }.
export default {
  ...ComponentTypes,
  'custom-authNavbarItem': AuthNavbarItem,
};
