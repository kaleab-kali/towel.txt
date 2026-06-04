const token = process.env.NODE_AUTH_TOKEN ?? process.env.NPM_TOKEN ?? "";

if (!token.trim()) {
  console.error(
    "Publish prerequisite check failed: configure the NPM_TOKEN repository secret before publishing."
  );
  process.exit(1);
}

process.stdout.write("Publish prerequisites verified.\n");
