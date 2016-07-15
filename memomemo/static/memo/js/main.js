let {Router, Route, Link, browserHistory} = window.ReactRouter;

let path = location.pathname;

class Index extends React.Component {
  render() {
    return (
      <div>
        <h1>Main</h1>
        <ul>
          <li><Link to={path+'/about'}>About</Link></li>
          <li><Link to={path+'/article'}>Article</Link></li>
        </ul>
        {this.props.children}
      </div>
    );
  }
}

class About extends React.Component {
  render() {
    return (
      <div>About</div>
    );
  }
}

class Article extends React.Component {
  render() {
    return (
      <div>Article</div>
    );
  }
}

ReactDOM.render((
  <Router history={browserHistory}>
    <Route path={path} component={Index}>
      <Route path={path+'/about'} component={About}/>
      <Route path={path+'/article'} component={Article}/>
    </Route>
  </Router>
  ), document.getElementById('content')
);
