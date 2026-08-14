#define _XOPEN_SOURCE 700
#include "colour.h"

int main(int argc, char **argv) {
  if (argc > 2) {
    fprintf(stderr, "usage: %s [art.txt]\n", argv[0]);
    return 2;
  }

  FILE *in = stdin;
  if (argc == 2) {
    in = fopen(argv[1], "r");
    if (!in) { perror(argv[1]); return 1; }
  }

  int rc = logoCRender(in, stdout);
  if (argc == 2 && fclose(in) != 0) rc = EOF;
  return rc == EOF ? 1 : 0;
}
