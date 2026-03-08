# Base image for C++ execution
FROM gcc:12

# Create a non-root user
RUN groupadd -r runner && useradd -m -r -g runner runner

WORKDIR /usr/src/app

COPY runners/runner.sh /usr/local/bin/runner
RUN chmod +x /usr/local/bin/runner

# Since C++ requires compilation and then execution, the worker must run
# g++ to compile to an output binary, and then run it.
# We keep this container ready for both tasks. 

# Both compilation and execution will run as the unprivileged user
USER runner

ENTRYPOINT ["/usr/local/bin/runner"]
