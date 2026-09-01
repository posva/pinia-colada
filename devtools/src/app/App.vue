<template>
  <header>
    <div>
      <strong>Pinia Colada Devtools fixtures</strong>
      <span>Local data only</span>
    </div>

    <nav aria-label="Fixture pages">
      <RouterLink to="/queries">Queries and values</RouterLink>
      <RouterLink to="/mutations">Mutations</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>
