interface Template {
  user: {
    name: string;
    email: string;
    age?: number;
  };
  posts: Array<{
    id: number;
    title: string;
    published: boolean;
  }>;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}