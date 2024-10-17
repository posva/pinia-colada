<script setup lang="ts"></script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">
          Home
        </RouterLink>
        |
        <RouterLink to="/contacts">
          Contacts
        </RouterLink>
        |
        <RouterLink to="/warnings">
          Warnings
        </RouterLink>
        |
        <RouterLink to="/hmr-tests">
          HMR tests
        </RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>
