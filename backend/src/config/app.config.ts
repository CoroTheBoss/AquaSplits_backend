export default () => ({
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aquasplit',
  },
  port: parseInt(process.env.PORT || '3000', 10),
});
