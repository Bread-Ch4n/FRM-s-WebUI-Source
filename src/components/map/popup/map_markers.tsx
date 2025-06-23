export function map_markers(data: any) {
  let popup: any = {
    title: data.Category ? `${data.Name} - ${data.Category}` : data.Name,
  };

  return {
    popup: popup,
  };
}
