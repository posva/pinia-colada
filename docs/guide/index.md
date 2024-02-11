# Guide

## Introduction

this is how you install

```ts
export const useContactList = defineQuery({
  key: 'contacts',
  query: () => getContactList(),

  // ... other options
})

export const useContact = defineQuery(() => {
  const route = useRoute()

  return {
    key: () => ['contacts', route.params.id],
    query: () => getContact(route.params.id),

    // ... other options
  }
})
```

Not possible to have different options. Possible to warn against duplicated keys

```ts
// in a component
useQuery({
  key: 'contacts',
  query: () => getContactList(),

  // ...other options
})
```

Options are redundant and having multiple calls can lead to having different options
