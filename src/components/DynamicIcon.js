import * as Icons from 'lucide-react';

export default function DynamicIcon({ name, ...props }) {
  const IconComponent = Icons[name];

  if (!IconComponent) {
    // Return a default icon or null if the name doesn't match
    const DefaultIcon = Icons.HelpCircle;
    return <DefaultIcon {...props} />;
  }

  return <IconComponent {...props} />;
}
