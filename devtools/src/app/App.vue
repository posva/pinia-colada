<template>
  <header>
    <div>
      <strong>Pinia Colada Devtools playground</strong>
    </div>

    <nav aria-label="Fixture pages">
      <RouterLink to="/queries">Queries and values</RouterLink>
      <RouterLink to="/mutations">Mutations</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>
